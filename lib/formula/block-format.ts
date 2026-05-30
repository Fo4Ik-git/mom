import type {
  BlockExpression,
  BlockOperand,
  CalculatorConfig,
} from "@/types/calculator";
import { filledAggregateArgs } from "@/lib/formula/aggregate-helpers";
import { isLineItemsField } from "@/lib/calculator/line-items";
import type { FormulaTarget } from "@/lib/formula/formula-target";
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
  target: FormulaTarget,
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
    case "lineColumn": {
      const input = getInputById(config, operand.fieldId);
      if (!input) {
        return "?";
      }
      const column = getPropertyLabel(input, operand.propertyId);
      return isLineItemsField(input)
        ? `${column} (row)`
        : `${input.label} · ${column}`;
    }
    case "calculation": {
      if (operand.calculationId === target.fieldId) {
        return "?";
      }
      const calculation = (config.calculations ?? []).find(
        (item) => item.id === operand.calculationId,
      );
      return calculation?.label ?? "?";
    }
    case "output": {
      if (operand.outputId === target.fieldId) {
        return "?";
      }
      const output = config.outputs.find((o) => o.id === operand.outputId);
      return output?.label ?? "?";
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
  target: FormulaTarget,
  quantityLabel: string,
): string {
  if (expression.type === "empty") {
    return "…";
  }

  if (expression.type === "operand") {
    return formatBlockOperand(
      expression.operand,
      config,
      target,
      quantityLabel,
    );
  }

  if (expression.type === "group") {
    const inner = formatBlockExpression(
      expression.inner,
      config,
      target,
      quantityLabel,
    );
    return `(${inner})`;
  }

  if (expression.type === "aggregate") {
    const parts = filledAggregateArgs(expression.args).map((arg) =>
      formatBlockExpression(arg, config, target, quantityLabel),
    );
    const inner = parts.length > 0 ? parts.join(", ") : "…";
    return `${expression.function}(${inner})`;
  }

  if (expression.type === "rowAggregate") {
    const input = getInputById(config, expression.fieldId);
    const table = input?.label.trim() || "…";
    const inner = formatBlockExpression(
      expression.inner,
      config,
      target,
      quantityLabel,
    );
    return `${expression.function} rows(${table}: ${inner})`;
  }

  const left = formatBlockExpression(
    expression.left,
    config,
    target,
    quantityLabel,
  );
  const right = formatBlockExpression(
    expression.right,
    config,
    target,
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
