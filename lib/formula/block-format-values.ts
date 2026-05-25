import type { BlockExpression, CalculatorConfig } from "@/types/calculator";
import { filledAggregateArgs } from "@/lib/formula/aggregate-helpers";
import { evaluateBlockExpression } from "@/lib/formula/block-evaluate";
import { evaluateAllFormulaFields } from "@/lib/formula/field-graph";

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
      ),
    );
    const inner = parts.length > 0 ? parts.join(", ") : "0";
    return `${expression.function}(${inner})`;
  }

  const left = formatBlockExpressionWithValues(
    expression.left,
    config,
    quantities,
    calculations,
    outputValues,
  );
  const right = formatBlockExpressionWithValues(
    expression.right,
    config,
    quantities,
    calculations,
    outputValues,
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
): Record<string, string> {
  const breakdowns: Record<string, string> = {};
  const { calculations, outputs } = evaluateAllFormulaFields(config, quantities);

  for (const output of config.outputs) {
    const expr = formatBlockExpressionWithValues(
      output.expression,
      config,
      quantities,
      calculations,
      outputs,
    );
    const result = formatNumber(values[output.id] ?? outputs[output.id] ?? 0);
    breakdowns[output.id] = `${expr} = ${result}`;
  }

  return breakdowns;
}
