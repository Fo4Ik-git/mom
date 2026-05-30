import type {
  CalculatorConfig,
  FormulaExpression,
  FormulaOperand,
  InputField,
} from "@/types/calculator";

export function getInputById(config: CalculatorConfig, fieldId: string) {
  return config.inputs.find((input) => input.id === fieldId);
}

export function getPropertyLabel(
  input: InputField,
  propertyId: string,
): string {
  return (
    input.properties.find((p) => p.id === propertyId)?.label ?? propertyId
  );
}

export function formatOperand(
  operand: FormulaOperand,
  config: CalculatorConfig,
  outputIndex: number,
  quantityLabel = "кількість",
): string {
  switch (operand.kind) {
    case "quantity": {
      const input = getInputById(config, operand.fieldId!);
      return input
        ? `${input.label} · ${quantityLabel}`
        : operand.fieldId ?? "?";
    }
    case "property": {
      const input = getInputById(config, operand.fieldId!);
      if (!input) {
        return "?";
      }
      return `${input.label} · ${getPropertyLabel(input, operand.propertyId!)}`;
    }
    case "output": {
      const output = config.outputs.find((o) => o.id === operand.outputId);
      if (!output) {
        return operand.outputId ?? "?";
      }
      const idx = config.outputs.findIndex((o) => o.id === operand.outputId);
      if (idx >= outputIndex) {
        return `${output.label} (?)`;
      }
      return output.label;
    }
    case "number":
      return String(operand.value ?? 0);
    case "group":
      return `(${formatExpression(operand.expression!, config, outputIndex, quantityLabel)})`;
    default:
      return "?";
  }
}

export function formatExpression(
  expression: FormulaExpression,
  config: CalculatorConfig,
  outputIndex: number,
  quantityLabel = "кількість",
): string {
  const opLabels: Record<string, string> = {
    "+": "+",
    "-": "−",
    "*": "×",
    "/": "÷",
  };
  return `${formatOperand(expression.left, config, outputIndex, quantityLabel)} ${opLabels[expression.operator]} ${formatOperand(expression.right, config, outputIndex, quantityLabel)}`;
}

export type OperandOption = {
  value: string;
  label: string;
  operand: FormulaOperand;
};

export function buildOperandOptions(
  config: CalculatorConfig,
  outputIndex: number,
  quantityLabel = "кількість",
): OperandOption[] {
  const options: OperandOption[] = [];

  for (const input of config.inputs) {
    options.push({
      value: `q:${input.id}`,
      label: `${input.label} · ${quantityLabel}`,
      operand: { kind: "quantity", fieldId: input.id },
    });
    for (const property of input.properties) {
      options.push({
        value: `p:${input.id}:${property.id}`,
        label: `${input.label} · ${property.label}`,
        operand: {
          kind: "property",
          fieldId: input.id,
          propertyId: property.id,
        },
      });
    }
  }

  config.outputs.slice(0, outputIndex).forEach((output) => {
    options.push({
      value: `o:${output.id}`,
      label: output.label,
      operand: { kind: "output", outputId: output.id },
    });
  });

  options.push({
    value: "n:0",
    label: "0",
    operand: { kind: "number", value: 0 },
  });

  return options;
}

export function operandToOptionValue(operand: FormulaOperand): string {
  switch (operand.kind) {
    case "quantity":
      return `q:${operand.fieldId}`;
    case "property":
      return `p:${operand.fieldId}:${operand.propertyId}`;
    case "output":
      return `o:${operand.outputId}`;
    case "number":
      return `n:${operand.value ?? 0}`;
    case "group":
      return "group";
    default:
      return "";
  }
}

export function optionValueToOperand(
  value: string,
  options: OperandOption[],
): FormulaOperand {
  const found = options.find((o) => o.value === value);
  if (found) {
    return found.operand;
  }
  return { kind: "number", value: 0 };
}
