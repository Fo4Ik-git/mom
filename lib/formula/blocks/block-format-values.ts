import type { BlockExpression, CalculatorConfig, LineItemRowsState } from "@/types/calculator";
import { filledAggregateArgs } from "@/lib/formula/core/aggregate-helpers";
import {
  computeFormulaLocalValues,
  evaluateBlockExpression,
} from "@/lib/formula/runtime/block-evaluate";
import { evaluateAllFormulaFields } from "@/lib/formula/runtime/field-graph";
import { buildInitialLineItemRowsState } from "@/lib/calculator/fields/line-items";

const OP_LABELS: Record<string, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
  ">": ">",
  "<": "<",
  ">=": "≥",
  "<=": "≤",
  "==": "=",
  "!=": "≠",
};

export function formatBlockExpressionWithValues(
  expression: BlockExpression,
  config: CalculatorConfig,
  quantities: Record<string, number>,
  calculations: Record<string, number>,
  outputValues: Record<string, number>,
  lineItemRows: LineItemRowsState = {},
  localValues: Record<string, number> = {},
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
          locals: localValues,
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
      localValues,
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
        localValues,
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
      localValues,
    );
    return `${expression.function} rows(${inner})`;
  }

  if (expression.type === "conditional") {
    const condition = formatBlockExpressionWithValues(
      expression.condition,
      config,
      quantities,
      calculations,
      outputValues,
      lineItemRows,
      localValues,
    );
    const whenTrue = formatBlockExpressionWithValues(
      expression.whenTrue,
      config,
      quantities,
      calculations,
      outputValues,
      lineItemRows,
      localValues,
    );
    const whenFalse = formatBlockExpressionWithValues(
      expression.whenFalse,
      config,
      quantities,
      calculations,
      outputValues,
      lineItemRows,
      localValues,
    );
    return `IF(${condition}, ${whenTrue}, ${whenFalse})`;
  }

  if (expression.type === "round") {
    const value = formatBlockExpressionWithValues(
      expression.value,
      config,
      quantities,
      calculations,
      outputValues,
      lineItemRows,
      localValues,
    );
    const decimals = formatBlockExpressionWithValues(
      expression.decimals,
      config,
      quantities,
      calculations,
      outputValues,
      lineItemRows,
      localValues,
    );
    if (decimals === "0") {
      return `ROUND(${value})`;
    }
    return `ROUND(${value}, ${decimals})`;
  }

  if (expression.type === "operation") {
    const left = formatBlockExpressionWithValues(
      expression.left,
      config,
      quantities,
      calculations,
      outputValues,
      lineItemRows,
      localValues,
    );
    const right = formatBlockExpressionWithValues(
      expression.right,
      config,
      quantities,
      calculations,
      outputValues,
      lineItemRows,
      localValues,
    );
    const op = OP_LABELS[expression.operator] ?? expression.operator;

    return `${left} ${op} ${right}`;
  }

  return "?";
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
