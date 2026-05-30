import type { BlockExpression, CalculatorConfig, LineItemRowsState } from "@/types/calculator";
import { filledAggregateArgs } from "@/lib/formula/aggregate-helpers";
import { evaluateBlockExpression } from "@/lib/formula/block-evaluate";
import { evaluateAllFormulaFields } from "@/lib/formula/field-graph";
import { buildInitialLineItemRowsState } from "@/lib/calculator/line-items";

const OP_LABELS: Record<string, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

export function formatBlockExpressionWithValues(
  expression: BlockExpression,
  config: CalculatorConfig,
  quantities: Record<string, number>,
  calculations: Record<string, number>,
  outputValues: Record<string, number>,
  lineItemRows: LineItemRowsState = {},
): string {
  if (expression.type === "empty") {
    return "0";
  }

  if (expression.type === "operand") {
    let value = 0;
    try {
      value = evaluateBlockExpression(
        { type: "operand", operand: expression.operand },
        {
          quantities,
          lineItemRows,
          inputs: config.inputs,
          constants: config.constants ?? [],
          calculations,
          outputs: outputValues,
        },
      );
    } catch {
      return "?";
    }
    return formatNumber(value);
  }

  if (expression.type === "group") {
    return `(${formatBlockExpressionWithValues(
      expression.inner,
      config,
      quantities,
      calculations,
      outputValues,
      lineItemRows,
    )})`;
  }

  if (expression.type === "aggregate") {
    const parts = filledAggregateArgs(expression.args).map((arg) =>
      formatBlockExpressionWithValues(
        arg,
        config,
        quantities,
        calculations,
        outputValues,
        lineItemRows,
      ),
    );
    const inner = parts.length > 0 ? parts.join(", ") : "0";
    return `${expression.function}(${inner})`;
  }

  if (expression.type === "rowAggregate") {
    const inner = formatBlockExpressionWithValues(
      expression.inner,
      config,
      quantities,
      calculations,
      outputValues,
      lineItemRows,
    );
    return `${expression.function} rows(${inner})`;
  }

  const left = formatBlockExpressionWithValues(
    expression.left,
    config,
    quantities,
    calculations,
    outputValues,
    lineItemRows,
  );
  const right = formatBlockExpressionWithValues(
    expression.right,
    config,
    quantities,
    calculations,
    outputValues,
    lineItemRows,
  );
  const op = OP_LABELS[expression.operator] ?? expression.operator;

  return `${left} ${op} ${right}`;
}

function formatNumber(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
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
    const expr = formatBlockExpressionWithValues(
      output.expression,
      config,
      quantities,
      calculations,
      outputs,
      rows,
    );
    const result = formatNumber(values[output.id] ?? outputs[output.id] ?? 0);
    breakdowns[output.id] = `${expr} = ${result}`;
  }

  return breakdowns;
}
