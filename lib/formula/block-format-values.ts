import type { BlockExpression, CalculatorConfig } from "@/types/calculator";
import { evaluateBlockExpression } from "@/lib/formula/block-evaluate";

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
  outputValues: Record<string, number>,
): string {
  if (expression.type === "empty") {
    return "0";
  }

  if (expression.type === "operand") {
    const value = evaluateBlockExpression(
      { type: "operand", operand: expression.operand },
      {
        quantities,
        inputs: config.inputs,
        constants: config.constants ?? [],
        outputs: outputValues,
      },
    );
    return formatNumber(value);
  }

  if (expression.type === "group") {
    return `(${formatBlockExpressionWithValues(
      expression.inner,
      config,
      quantities,
      outputValues,
    )})`;
  }

  const left = formatBlockExpressionWithValues(
    expression.left,
    config,
    quantities,
    outputValues,
  );
  const right = formatBlockExpressionWithValues(
    expression.right,
    config,
    quantities,
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
  const priorOutputs: Record<string, number> = {};

  for (const output of config.outputs) {
    const expr = formatBlockExpressionWithValues(
      output.expression,
      config,
      quantities,
      priorOutputs,
    );
    const result = formatNumber(values[output.id] ?? 0);
    breakdowns[output.id] = `${expr} = ${result}`;
    priorOutputs[output.id] = values[output.id] ?? 0;
  }

  return breakdowns;
}
