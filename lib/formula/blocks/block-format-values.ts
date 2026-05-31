import type { CalculatorConfig, LineItemRowsState } from "@/types/calculator";
import {
  computeFormulaLocalValues,
} from "@/lib/formula/runtime/block-evaluate";
import { evaluateAllFormulaFields } from "@/lib/formula/runtime/field-graph";
import { buildInitialLineItemRowsState } from "@/lib/calculator/fields/line-items";
import { formatExpressionWithValuesViaRegistry } from "@/lib/formula/nodes/registry";

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function formatBlockExpressionWithValues(
  expression: import("@/types/calculator").BlockExpression,
  config: CalculatorConfig,
  quantities: Record<string, number>,
  calculations: Record<string, number>,
  outputValues: Record<string, number>,
  lineItemRows: LineItemRowsState = {},
  localValues: Record<string, number> = {},
  macros?: Record<string, number>,
): string {
  return formatExpressionWithValuesViaRegistry(expression, {
    config,
    quantities,
    calculations,
    outputs: outputValues,
    lineItemRows,
    locals: localValues,
    macros,
  });
}

export function buildOutputBreakdowns(
  config: CalculatorConfig,
  quantities: Record<string, number>,
  values: Record<string, number>,
  lineItemRows?: LineItemRowsState,
): Record<string, string> {
  const breakdowns: Record<string, string> = {};
  const rows = lineItemRows ?? buildInitialLineItemRowsState(config.inputs);
  const { calculations, outputs } = evaluateAllFormulaFields(
    config,
    quantities,
    undefined,
    rows,
  );

  for (const output of config.outputs) {
    const evalContext = {
      quantities,
      lineItemRows: rows,
      inputs: config.inputs,
      constants: config.constants ?? [],
      calculations,
      outputs,
    };
    const localValues = computeFormulaLocalValues(output.locals, evalContext);
    const localSummary =
      output.locals && output.locals.length > 0
        ? output.locals
            .map((local) => {
              const value = formatNumber(localValues[local.id] ?? 0);
              return `${local.id} = ${value}`;
            })
            .join("; ")
        : "";
    const expr = formatBlockExpressionWithValues(
      output.expression,
      config,
      quantities,
      calculations,
      outputs,
      rows,
      localValues,
    );
    const result = formatNumber(values[output.id] ?? outputs[output.id] ?? 0);
    const prefix = localSummary ? `${localSummary}; ` : "";
    breakdowns[output.id] = `${prefix}${expr} = ${result}`;
  }

  return breakdowns;
}
