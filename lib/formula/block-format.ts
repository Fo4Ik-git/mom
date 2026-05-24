import type {
  BlockExpression,
  BlockOperand,
  CalculatorConfig,
} from "@/types/calculator";
import { getInputById, getPropertyLabel } from "@/lib/formula/operand-labels";

const OP_LABELS: Record<string, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

export function formatBlockOperand(
  operand: BlockOperand,
  config: CalculatorConfig,
  outputIndex: number,
  quantityLabel: string,
): string {
  switch (operand.kind) {
    case "quantity": {
      const input = getInputById(config, operand.fieldId);
      return input ? `${input.label} · ${quantityLabel}` : "?";
    }
    case "property": {
      const input = getInputById(config, operand.fieldId);
      if (!input) {
        return "?";
      }
      return `${input.label} · ${getPropertyLabel(input, operand.propertyId)}`;
    }
    case "output": {
      const output = config.outputs.find((o) => o.id === operand.outputId);
      if (!output) {
        return "?";
      }
      const idx = config.outputs.findIndex((o) => o.id === operand.outputId);
      if (idx >= outputIndex) {
        return `${output.label}?`;
      }
      return output.label;
    }
    case "number":
      return String(operand.value);
    case "constant": {
      const constant = (config.constants ?? []).find(
        (c) => c.id === operand.constantId,
      );
      return constant ? constant.label : "?";
    }
    default:
      return "?";
  }
}

export function formatBlockExpression(
  expression: BlockExpression,
  config: CalculatorConfig,
  outputIndex: number,
  quantityLabel: string,
): string {
  if (expression.type === "empty") {
    return "…";
  }

  if (expression.type === "operand") {
    return formatBlockOperand(
      expression.operand,
      config,
      outputIndex,
      quantityLabel,
    );
  }

  if (expression.type === "group") {
    const inner = formatBlockExpression(
      expression.inner,
      config,
      outputIndex,
      quantityLabel,
    );
    return `(${inner})`;
  }

  const left = formatBlockExpression(
    expression.left,
    config,
    outputIndex,
    quantityLabel,
  );
  const right = formatBlockExpression(
    expression.right,
    config,
    outputIndex,
    quantityLabel,
  );
  const op = OP_LABELS[expression.operator] ?? expression.operator;

  const needsParens =
    expression.left.type === "operation" ||
    expression.right.type === "operation" ||
    expression.left.type === "group" ||
    expression.right.type === "group";

  if (needsParens) {
    return `(${left} ${op} ${right})`;
  }

  return `${left} ${op} ${right}`;
}
