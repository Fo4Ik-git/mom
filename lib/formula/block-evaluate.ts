import type {
  BlockExpression,
  BlockOperand,
  CalculatorConfig,
  CalculatorConstant,
  InputField,
} from "@/types/calculator";

interface EvalContext {
  quantities: Record<string, number>;
  inputs: InputField[];
  constants: CalculatorConstant[];
  outputs: Record<string, number>;
  onWarning?: (message: string) => void;
}

function getPropertyValue(input: InputField, propertyId: string): number {
  const property = input.properties.find((p) => p.id === propertyId);
  return property?.value ?? 0;
}

function evaluateOperand(operand: BlockOperand, context: EvalContext): number {
  switch (operand.kind) {
    case "quantity":
      return context.quantities[operand.fieldId] ?? 0;
    case "property": {
      const input = context.inputs.find((f) => f.id === operand.fieldId);
      if (!input) {
        throw new Error(`Unknown field: ${operand.fieldId}`);
      }
      return getPropertyValue(input, operand.propertyId);
    }
    case "output": {
      const value = context.outputs[operand.outputId];
      if (value === undefined) {
        throw new Error(`Unknown output: ${operand.outputId}`);
      }
      return value;
    }
    case "number":
      return operand.value;
    case "constant": {
      const constant = context.constants.find(
        (c) => c.id === operand.constantId,
      );
      if (!constant) {
        throw new Error(`Unknown constant: ${operand.constantId}`);
      }
      return constant.value;
    }
    default:
      throw new Error("Invalid operand");
  }
}

export function evaluateBlockExpression(
  expression: BlockExpression,
  context: EvalContext,
): number {
  if (expression.type === "empty") {
    return 0;
  }

  if (expression.type === "operand") {
    return evaluateOperand(expression.operand, context);
  }

  if (expression.type === "group") {
    return evaluateBlockExpression(expression.inner, context);
  }

  const left = evaluateBlockExpression(expression.left, context);
  const right = evaluateBlockExpression(expression.right, context);

  switch (expression.operator) {
    case "+":
      return left + right;
    case "-":
      return left - right;
    case "*":
      return left * right;
    case "/":
      if (right === 0) {
        context.onWarning?.(
          "Ділення на нуль — перевірте кількість у полях або змініть формулу (прибуток не може ділитися на 0)",
        );
        return 0;
      }
      return left / right;
    default:
      throw new Error("Invalid operator");
  }
}

export function calculateFromConfig(
  config: CalculatorConfig,
  quantities: Record<string, number>,
): Record<string, number> {
  const results: Record<string, number> = {};
  const constants = config.constants ?? [];

  for (const output of config.outputs) {
    const context: EvalContext = {
      quantities,
      inputs: config.inputs,
      constants,
      outputs: results,
    };
    results[output.id] = evaluateBlockExpression(output.expression, context);
  }

  return results;
}
