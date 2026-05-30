"use client";

import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import { LineItemsTable } from "@/app/components/calculator/line-items-table";
import { isTimeField, timeFieldPreview } from "@/lib/calculator/fields/time-service";
import {
  buildInitialLineItemRowsState,
  isLineItemsField,
} from "@/lib/calculator/fields/line-items";
import { ActionButtons } from "@/app/components/action-buttons";
import { ResultPanel } from "@/app/components/result-panel";
import { Card, CardTitle } from "@/app/components/ui/card";
import {
  calculateFromConfigWithDiagnostics,
  type CalculationWarning,
} from "@/lib/formula/runtime/calculate";
import { buildOutputBreakdowns } from "@/lib/formula/blocks/block-format-values";
import type { CalculatorConfig, LineItemRowsState } from "@/types/calculator";

interface DynamicCalculatorProps {
  config: CalculatorConfig;
}

function buildInitialQuantities(config: CalculatorConfig) {
  return Object.fromEntries(
    config.inputs
      .filter((input) => !isLineItemsField(input))
      .map((input) => [input.id, input.defaultQuantity ?? 0]),
  );
}

export function DynamicCalculator({ config }: DynamicCalculatorProps) {
  const t = useTranslations("calculator");
  const tb = useTranslations("builder");
  const [quantities, setQuantities] = useState<Record<string, number>>(() =>
    buildInitialQuantities(config),
  );
  const [lineItemRows, setLineItemRows] = useState<LineItemRowsState>(() =>
    buildInitialLineItemRowsState(config.inputs),
  );
  const [results, setResults] = useState<Record<string, number> | null>(null);
  const [warnings, setWarnings] = useState<CalculationWarning[]>([]);

  const scalarInputs = config.inputs.filter(
    (input) => !isLineItemsField(input),
  );
  const lineItemInputs = config.inputs.filter(isLineItemsField);

  function runCalculation(
    nextQuantities: Record<string, number>,
    nextRows: LineItemRowsState,
  ) {
    try {
      const { values, warnings: nextWarnings } =
        calculateFromConfigWithDiagnostics(config, nextQuantities, nextRows);
      setResults(values);
      setWarnings(nextWarnings);
    } catch {
      setResults(null);
      setWarnings([]);
    }
  }

  useEffect(() => {
    setQuantities(buildInitialQuantities(config));
    setLineItemRows(buildInitialLineItemRowsState(config.inputs));
  }, [config]);

  useEffect(() => {
    runCalculation(quantities, lineItemRows);
  }, [config, quantities, lineItemRows]);

  const resultRows = useMemo(() => {
    if (!results) {
      return null;
    }

    const breakdowns = buildOutputBreakdowns(
      config,
      quantities,
      results,
      lineItemRows,
    );

    return config.outputs.map((output) => ({
      label: output.label,
      value: results[output.id] ?? 0,
      highlight: output.highlight,
      warning: warnings.find((w) => w.outputId === output.id)?.message,
      breakdown: breakdowns[output.id],
    }));
  }, [config, config.outputs, quantities, lineItemRows, results, warnings]);

  const handleCalculate = () => {
    runCalculation(quantities, lineItemRows);
  };

  const handleClear = () => {
    const initialQuantities = buildInitialQuantities(config);
    const initialRows = buildInitialLineItemRowsState(config.inputs);
    setQuantities(initialQuantities);
    setLineItemRows(initialRows);
    setResults(null);
    setWarnings([]);
    runCalculation(initialQuantities, initialRows);
  };

  return (
    <div className="space-y-5">
      {scalarInputs.length > 0 && (
        <Card>
          <CardTitle className="mb-4 text-muted-foreground">
            {t("positions")}
          </CardTitle>
          <p className="mb-4 text-xs text-muted-foreground">
            {t("quantityHint")}
          </p>
          <div className="space-y-5">
            {scalarInputs.map((input) => (
              <div key={input.id} className="space-y-3">
                <label
                  htmlFor={`qty-${input.id}`}
                  className="block text-sm font-semibold text-foreground"
                >
                  {input.label}
                </label>

                {isTimeField(input) ? (
                  <p className="text-xs text-muted-foreground">
                    {t("timeServiceHint", {
                      preview: timeFieldPreview(input, tb),
                    })}
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {input.properties.map((property) => (
                      <span
                        key={property.id}
                        className="rounded-full bg-muted px-2.5 py-1 text-xs text-muted-foreground"
                      >
                        {property.label}: {property.value}
                      </span>
                    ))}
                  </div>
                )}

                <span className="text-xs font-medium text-muted-foreground">
                  {isTimeField(input)
                    ? t("timeQuantityLabel")
                    : t("quantityLabel")}
                </span>

                <input
                  id={`qty-${input.id}`}
                  type="number"
                  min={0}
                  step="any"
                  value={quantities[input.id] ?? 0}
                  list={input.presets ? `presets-${input.id}` : undefined}
                  onChange={(e) =>
                    setQuantities((current) => ({
                      ...current,
                      [input.id]: Number(e.target.value) || 0,
                    }))
                  }
                  className="block h-12 w-full rounded-xl border border-border bg-input px-3.5 text-base shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-ring/30"
                />

                {input.presets && (
                  <>
                    <datalist id={`presets-${input.id}`}>
                      {input.presets.map((preset) => (
                        <option key={preset} value={preset} />
                      ))}
                    </datalist>
                    <div className="flex flex-wrap gap-2">
                      {input.presets.map((preset) => (
                        <button
                          key={preset}
                          type="button"
                          onClick={() =>
                            setQuantities((c) => ({ ...c, [input.id]: preset }))
                          }
                          className="rounded-full border border-border bg-card px-3 py-1.5 text-sm transition hover:border-accent hover:bg-accent-muted"
                        >
                          {preset}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </Card>
      )}

      {lineItemInputs.map((field) => (
        <Card key={field.id}>
          <CardTitle className="mb-2 text-muted-foreground">{field.label}</CardTitle>
          <p className="mb-4 text-xs text-muted-foreground">{t("lineItemsHint")}</p>
          <LineItemsTable
            field={field}
            rows={lineItemRows[field.id] ?? []}
            onChange={(rows) =>
              setLineItemRows((current) => ({ ...current, [field.id]: rows }))
            }
            labels={{
              addRow: t("addRow"),
              removeRow: t("removeRow"),
              row: t("rowLabel"),
            }}
          />
        </Card>
      ))}

      <ActionButtons onCalculate={handleCalculate} onClear={handleClear} />
      <ResultPanel rows={resultRows} />
    </div>
  );
}
