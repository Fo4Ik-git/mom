"use client";

import { AddInputPatternMenu } from "@/app/components/builder/add-input-pattern-menu";
import {
    BuilderCollapsible,
    BuilderSection,
} from "@/app/components/builder/builder-collapsible";
import { ConstantsCard } from "@/app/components/builder/constants-card";
import { ConfigCodeSheet } from "@/app/components/builder/config-code-sheet";
import { DocsHelpLink } from "@/app/components/docs/docs-help-link";
import { FormulaBuilder } from "@/app/components/builder/formula-builder";
import { InputFieldsEditor } from "@/app/components/builder/input-fields-editor";
import { OutputSnippetMenu } from "@/app/components/builder/output-snippet-menu";
import { DynamicCalculator } from "@/app/components/calculator/dynamic-calculator";
import { Button } from "@/app/components/ui/button";
import { useRouter } from "@/i18n/navigation";
import { appFetch } from "@/lib/api/api-client";
import { isAutoCalculationId } from "@/lib/calculator/config/auto-calculations";
import { finalizeConfig } from "@/lib/calculator/config/sync";
import {
    applyInputPattern,
    type InputPatternId,
} from "@/lib/calculator/config/input-patterns";
import { formatBlockExpression } from "@/lib/formula/blocks/block-format";
import type {
    BlockExpression,
    CalculationField,
    CalculatorConfig,
    CalculatorConstant,
    FormulaLocal,
    OutputField,
} from "@/types/calculator";
import { emptyBlockExpression, slugifyId } from "@/types/calculator";
import { useTranslations } from "next-intl";
import { useState } from "react";

interface CalculatorBuilderProps {
  calculatorId?: string;
  initialName?: string;
  initialDescription?: string;
  initialConfig: CalculatorConfig;
  initialIsPublic?: boolean;
}

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

function patternLabels(t: (key: string) => string) {
  return {
    cost: t("patternLabelCost"),
    price: t("patternLabelPrice"),
    time: {
      durationHours: t("timeDurationHours"),
      durationMinutes: t("timeDurationMinutes"),
      ratePerHour: t("timeRatePerHour"),
      ratePerMinute: t("timeRatePerMinute"),
    },
    unitPrice: t("patternLabelUnitPrice"),
    service: t("patternLabelService"),
    consumable: t("patternLabelConsumable"),
    lineItems: t("patternLabelLineItems"),
    qty: t("patternLabelQty"),
  };
}

function formulaSummary(
  config: CalculatorConfig,
  expression: BlockExpression,
  fieldId: string,
  quantityLabel: string,
) {
  const preview = formatBlockExpression(
    expression,
    config,
    { fieldId },
    quantityLabel,
  );
  if (!preview || preview === "…") {
    return "…";
  }
  return preview.length > 52 ? `${preview.slice(0, 52)}…` : preview;
}

function applyFormulaUpdate(
  field: { expression: BlockExpression; locals?: FormulaLocal[] },
  expression: BlockExpression,
  locals?: FormulaLocal[] | null,
) {
  if (locals === null) {
    return { expression, locals: undefined };
  }
  if (locals !== undefined) {
    return { expression, locals };
  }
  return { expression, locals: field.locals };
}

function emptyOutput(): OutputField {
  return {
    id: randomId("output"),
    label: "",
    expression: emptyBlockExpression(),
  };
}

function emptyCalculation(): CalculationField {
  return {
    id: randomId("calculation"),
    label: "",
    expression: emptyBlockExpression(),
  };
}

function emptyConstant(): CalculatorConstant {
  return {
    id: randomId("const"),
    label: "",
    value: 0,
  };
}

export function CalculatorBuilder({
  calculatorId,
  initialName,
  initialDescription = "",
  initialConfig,
  initialIsPublic = false,
}: CalculatorBuilderProps) {
  const t = useTranslations("builder");
  const tc = useTranslations("common");
  const router = useRouter();
  const quantityLabel = t("quantityLabel");

  const [name, setName] = useState(initialName ?? t("newTitle"));
  const [description, setDescription] = useState(initialDescription);
  const [isPublic, setIsPublic] = useState(initialIsPublic);
  const [config, setConfig] = useState<CalculatorConfig>({
    ...initialConfig,
    constants: initialConfig.constants ?? [],
    calculations: initialConfig.calculations ?? [],
  });
  const [error, setError] = useState<string | null>(null);
  const [errorIssues, setErrorIssues] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [codeSheetOpen, setCodeSheetOpen] = useState(false);
  const [scriptPreviewConfig, setScriptPreviewConfig] =
    useState<CalculatorConfig | null>(null);
  const autoTotalSuffix = t("autoTotalSuffix");
  const previewConfig = scriptPreviewConfig ?? config;

  function applyPattern(patternId: InputPatternId, count = 1) {
    setConfig((current) =>
      finalizeConfig(
        applyInputPattern(current, patternId, patternLabels(t), { count }),
        autoTotalSuffix,
      ),
    );
  }

  async function handleSave() {
    setSaving(true);
    setError(null);
    setErrorIssues([]);

    const payload = { name, description, config, isPublic };
    const response = await appFetch(
      calculatorId ? `/api/calculators/${calculatorId}` : "/api/calculators",
      {
        method: calculatorId ? "PATCH" : "POST",
        body: JSON.stringify(payload),
      },
    );

    const data = await response.json();
    setSaving(false);

    if (!response.ok) {
      setError(data.error ?? t("saveError"));
      setErrorIssues(Array.isArray(data.issues) ? data.issues : []);
      return;
    }

    router.push(`/builder/${data.calculator.id}`);
    router.refresh();
  }

  async function handleDelete() {
    if (!calculatorId) {
      return;
    }
    if (!confirm(t("deleteConfirm", { name: name.trim() || t("newTitle") }))) {
      return;
    }

    setDeleting(true);
    setError(null);
    setErrorIssues([]);

    const response = await appFetch(`/api/calculators/${calculatorId}`, {
      method: "DELETE",
    });

    setDeleting(false);

    if (!response.ok) {
      const data = await response.json().catch(() => ({}));
      setError(data.error ?? t("deleteFailed"));
      return;
    }

    router.push("/");
    router.refresh();
  }

  const manualCalculations = (config.calculations ?? []).filter(
    (c) => !isAutoCalculationId(c.id),
  );
  const autoCalculations = (config.calculations ?? []).filter((c) =>
    isAutoCalculationId(c.id),
  );

  return (
    <div className="space-y-6">
      <ConfigCodeSheet
        open={codeSheetOpen}
        config={config}
        onClose={() => {
          setScriptPreviewConfig(null);
          setCodeSheetOpen(false);
        }}
        onApply={setConfig}
        onPreviewConfig={setScriptPreviewConfig}
      />
      <div className="grid gap-6 xl:grid-cols-[minmax(0,3fr)_minmax(280px,380px)] 2xl:grid-cols-[minmax(0,3.5fr)_minmax(300px,400px)]">
        <div className="min-w-0 space-y-5">
          <BuilderSection title={t("settings")} defaultOpen={false}>
            <div className="space-y-3 rounded-2xl border border-border bg-card p-4">
              <label className="block space-y-1.5">
                <span className="text-sm text-muted-foreground">{t("title")}</span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="h-11 w-full rounded-xl border border-border bg-input px-3.5 text-sm"
                />
              </label>
              <label className="block space-y-1.5">
                <span className="text-sm text-muted-foreground">
                  {t("description")}
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={2}
                  className="w-full rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm"
                />
              </label>
              <label className="flex items-center gap-2.5 text-sm">
                <input
                  type="checkbox"
                  checked={isPublic}
                  onChange={(e) => setIsPublic(e.target.checked)}
                  className="size-4 accent-accent"
                />
                {t("publicToggle")}
              </label>
              {calculatorId && (
                <div className="border-t border-border/70 pt-3">
                  <button
                    type="button"
                    onClick={handleDelete}
                    disabled={saving || deleting}
                    className="text-sm font-medium text-destructive hover:underline disabled:opacity-50"
                  >
                    {deleting ? tc("loading") : t("deleteCalculator")}
                  </button>
                </div>
              )}
            </div>
          </BuilderSection>

          <BuilderSection
            title={t("inputFields")}
            description={t("inputFieldsDesc")}
            count={config.inputs.length}
            defaultOpen
            actions={
              <AddInputPatternMenu
                onSelect={applyPattern}
                maxCount={Math.max(1, 50 - config.inputs.length)}
              />
            }
          >
            <InputFieldsEditor
              config={config}
              autoTotalSuffix={autoTotalSuffix}
              onConfigChange={setConfig}
            />
          </BuilderSection>

          <BuilderSection
            title={t("constants")}
            description={t("constantsDesc")}
            count={(config.constants ?? []).length}
            defaultOpen={false}
            actions={
              <button
                type="button"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    constants: [...(c.constants ?? []), emptyConstant()],
                  }))
                }
                className="shrink-0 rounded-xl bg-accent-muted px-3 py-2 text-sm font-medium text-accent"
              >
                {t("addConstant")}
              </button>
            }
          >
            {(config.constants ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                {t("constantsEmpty")}
              </p>
            ) : (
              <div className="space-y-2">
                {(config.constants ?? []).map((constant, index) => (
                  <ConstantsCard
                    key={constant.id}
                    constant={constant}
                    canRemove
                    onChange={(updated) =>
                      setConfig((c) => ({
                        ...c,
                        constants: (c.constants ?? []).map((item, i) =>
                          i === index ? updated : item,
                        ),
                      }))
                    }
                    onRemove={() =>
                      setConfig((c) => ({
                        ...c,
                        constants: (c.constants ?? []).filter(
                          (_, i) => i !== index,
                        ),
                      }))
                    }
                  />
                ))}
              </div>
            )}
          </BuilderSection>

          <BuilderSection
            title={t("calculationFields")}
            description={t("calculationFieldsDesc")}
            count={manualCalculations.length}
            defaultOpen={manualCalculations.length > 0}
            actions={
              <button
                type="button"
                onClick={() =>
                  setConfig((c) => ({
                    ...c,
                    calculations: [...(c.calculations ?? []), emptyCalculation()],
                  }))
                }
                className="shrink-0 rounded-xl bg-accent-muted px-3 py-2 text-sm font-medium text-accent"
              >
                {t("addCalculation")}
              </button>
            }
          >
            {(config.calculations ?? []).length === 0 ? (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-sm text-muted-foreground">
                {t("calculationFieldsEmpty")}
              </p>
            ) : (
              <div className="space-y-3">
                {manualCalculations.map((calculation) => {
                  const index = (config.calculations ?? []).findIndex(
                    (item) => item.id === calculation.id,
                  );
                  return (
                    <BuilderCollapsible
                      key={calculation.id}
                      title={calculation.label.trim() || t("unnamedField")}
                      subtitle={formulaSummary(
                        config,
                        calculation.expression,
                        calculation.id,
                        quantityLabel,
                      )}
                      defaultOpen={!calculation.label.trim()}
                      headerActions={
                        <button
                          type="button"
                          onClick={() =>
                            setConfig((c) => ({
                              ...c,
                              calculations: (c.calculations ?? []).filter(
                                (_, i) => i !== index,
                              ),
                            }))
                          }
                          className="rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                        >
                          {tc("delete")}
                        </button>
                      }
                    >
                      <label className="block space-y-1.5">
                        <span className="text-xs font-medium text-muted-foreground">
                          {t("calculationFieldName")}
                        </span>
                        <input
                          value={calculation.label}
                          onChange={(e) => {
                            const label = e.target.value;
                            setConfig((c) => ({
                              ...c,
                              calculations: (c.calculations ?? []).map((item, i) =>
                                i === index ? { ...item, label } : item,
                              ),
                            }));
                          }}
                          onBlur={(e) => {
                            const label = e.target.value.trim();
                            if (!label) {
                              return;
                            }
                            setConfig((c) => ({
                              ...c,
                              calculations: (c.calculations ?? []).map((item, i) =>
                                i === index
                                  ? { ...item, label, id: slugifyId(label, "calc") }
                                  : item,
                              ),
                            }));
                          }}
                          placeholder={t("calculationFieldNamePlaceholder")}
                          className="h-11 w-full rounded-xl border border-border bg-input px-3.5 text-sm font-medium"
                        />
                      </label>
                      <FormulaBuilder
                        config={config}
                        formulaTarget={{ fieldId: calculation.id }}
                        fieldKey={calculation.id}
                        fieldLabel={calculation.label}
                        expression={calculation.expression}
                        locals={calculation.locals}
                        onChange={(expression, locals) =>
                          setConfig((c) => ({
                            ...c,
                            calculations: (c.calculations ?? []).map((item, i) =>
                              i === index
                                ? {
                                    ...item,
                                    ...applyFormulaUpdate(item, expression, locals),
                                  }
                                : item,
                            ),
                          }))
                        }
                      />
                    </BuilderCollapsible>
                  );
                })}

                {autoCalculations.length > 0 && (
                  <BuilderSection
                    title={t("autoCalcSection")}
                    count={autoCalculations.length}
                    defaultOpen={false}
                  >
                    <div className="space-y-2">
                      {autoCalculations.map((calculation) => (
                        <BuilderCollapsible
                          key={calculation.id}
                          title={calculation.label}
                          subtitle={formulaSummary(
                            config,
                            calculation.expression,
                            calculation.id,
                            quantityLabel,
                          )}
                          badge={
                            <span className="rounded-full bg-orange-500/15 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-700 dark:text-orange-200">
                              {t("autoCalcBadge")}
                            </span>
                          }
                          defaultOpen={false}
                        >
                          <p className="text-xs text-muted-foreground">
                            {t("autoCalcHint")}
                          </p>
                          <FormulaBuilder
                            config={config}
                            formulaTarget={{ fieldId: calculation.id }}
                            fieldKey={calculation.id}
                            fieldLabel={calculation.label}
                            expression={calculation.expression}
                            onChange={() => undefined}
                            codeReadOnly
                          />
                        </BuilderCollapsible>
                      ))}
                    </div>
                  </BuilderSection>
                )}
              </div>
            )}
          </BuilderSection>

          <BuilderSection
            title={t("outputFields")}
            description={t("outputFieldsDesc")}
            count={config.outputs.length}
            defaultOpen
            actions={
              <div className="flex flex-wrap items-center justify-end gap-2">
                <OutputSnippetMenu config={config} onAdd={setConfig} />
                <button
                  type="button"
                  onClick={() =>
                    setConfig((c) => ({
                      ...c,
                      outputs: [...c.outputs, emptyOutput()],
                    }))
                  }
                  className="shrink-0 rounded-xl bg-accent-muted px-3 py-2 text-sm font-medium text-accent"
                >
                  {t("addOutput")}
                </button>
              </div>
            }
          >
            <div className="space-y-3">
              {config.outputs.map((output, index) => (
                <BuilderCollapsible
                  key={output.id}
                  title={output.label.trim() || t("unnamedField")}
                  subtitle={formulaSummary(
                    config,
                    output.expression,
                    output.id,
                    quantityLabel,
                  )}
                  defaultOpen={
                    index === config.outputs.length - 1 && !output.label.trim()
                  }
                  headerActions={
                    config.outputs.length > 1 ? (
                      <button
                        type="button"
                        onClick={() =>
                          setConfig((c) => ({
                            ...c,
                            outputs: c.outputs.filter((_, i) => i !== index),
                          }))
                        }
                        className="rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
                      >
                        {tc("delete")}
                      </button>
                    ) : undefined
                  }
                >
                  <label className="block space-y-1.5">
                    <span className="text-xs font-medium text-muted-foreground">
                      {t("outputFieldName")}
                    </span>
                    <input
                      value={output.label}
                      onChange={(e) => {
                        const label = e.target.value;
                        setConfig((c) => ({
                          ...c,
                          outputs: c.outputs.map((o, i) =>
                            i === index ? { ...o, label } : o,
                          ),
                        }));
                      }}
                      onBlur={(e) => {
                        const label = e.target.value.trim();
                        if (!label) {
                          return;
                        }
                        setConfig((c) => ({
                          ...c,
                          outputs: c.outputs.map((o, i) =>
                            i === index
                              ? { ...o, label, id: slugifyId(label, "output") }
                              : o,
                          ),
                        }));
                      }}
                      placeholder={t("outputFieldNamePlaceholder")}
                      className="h-11 w-full rounded-xl border border-border bg-input px-3.5 text-sm font-medium"
                    />
                  </label>

                  <label className="flex items-center gap-2 text-xs">
                    <input
                      type="checkbox"
                      checked={Boolean(output.highlight)}
                      onChange={(e) =>
                        setConfig((c) => ({
                          ...c,
                          outputs: c.outputs.map((o, i) =>
                            i === index
                              ? { ...o, highlight: e.target.checked }
                              : o,
                          ),
                        }))
                      }
                      className="size-3.5 accent-accent"
                    />
                    {t("highlight")}
                  </label>

                  <FormulaBuilder
                    config={config}
                    formulaTarget={{ fieldId: output.id }}
                    fieldKey={output.id}
                    fieldLabel={output.label}
                    expression={output.expression}
                    locals={output.locals}
                    onChange={(expression, locals) =>
                      setConfig((c) => ({
                        ...c,
                        outputs: c.outputs.map((o, i) =>
                          i === index
                            ? {
                                ...o,
                                ...applyFormulaUpdate(o, expression, locals),
                              }
                            : o,
                        ),
                      }))
                    }
                  />
                </BuilderCollapsible>
              ))}
            </div>
          </BuilderSection>

          {error && (
            <div className="rounded-xl border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm text-destructive">
              <p className="font-medium">{error}</p>
              {errorIssues.length > 0 && (
                <ul className="mt-2 list-disc space-y-1 pl-5">
                  {errorIssues.map((issue) => (
                    <li key={issue}>{issue}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCodeSheetOpen(true)}
              className="w-full sm:w-auto"
            >
              {t("codeModeOpen")}
            </Button>
            <DocsHelpLink hash="input" />
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              {saving ? tc("saving") : tc("save")}
            </Button>
          </div>
        </div>

        <div className="min-w-0 xl:sticky xl:top-24 xl:self-start">
          <h2 className="mb-4 text-lg font-semibold">{t("preview")}</h2>
          <DynamicCalculator config={previewConfig} />
        </div>
      </div>
    </div>
  );
}
