import type {
  BlockExpression,
  BlockOperand,
  CalculatorConfig,
  CalculatorConstant,
  InputField,
  LineItemRowsState,
} from "@/types/calculator";
import { filledAggregateArgs } from "@/lib/formula/aggregate-helpers";
import { isLineItemsField } from "@/lib/calculator/line-items";

export interface EvalContext {
  quantities: Record<string, number>;
  lineItemRows: LineItemRowsState;
  currentLineRow?: Record<string, number>;
  inputs: InputField[];
  constants: CalculatorConstant[];
  calculations: Record<string, number>;
  outputs: Record<string, number>;
  onWarning?: (message: string) => void;
}

function getPropertyValue(input: InputField, propertyId: string): number {
  const property = input.properties.find((p) => p.id === propertyId);
  return property?.value ?? 0;
}

function evaluateRowAggregateValues(
  expression: Extract<BlockExpression, { type: "rowAggregate" }>,
  context: EvalContext,
): number[] {
  const field = context.inputs.find((input) => input.id === expression.fieldId);
  if (!field || !isLineItemsField(field)) {
    return [];
  }

  const rows = context.lineItemRows[expression.fieldId] ?? [];
  return rows.map((row) =>
    evaluateBlockExpression(expression.inner, {
      ...context,
      currentLineRow: row,
    }),
  );
}

function applyAggregateFunction(
  fn: Extract<BlockExpression, { type: "aggregate" }>["function"],
  values: number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  switch (fn) {
    case "SUM":
      return values.reduce((sum, value) => sum + value, 0);
    case "COUNT":
      return values.length;
    case "AVG":
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    case "MIN":
      return Math.min(...values);
    case "MAX":
      return Math.max(...values);
    default:
      throw new Error("Invalid aggregate function");
  }
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
    case "lineColumn": {
      if (context.currentLineRow) {
        return context.currentLineRow[operand.propertyId] ?? 0;
      }
      const input = context.inputs.find((f) => f.id === operand.fieldId);
      if (!input) {
        throw new Error(`Unknown line items field: ${operand.fieldId}`);
      }
      return getPropertyValue(input, operand.propertyId);
    }
    case "calculation": {
      const value = context.calculations[operand.calculationId];
      if (value === undefined) {
        throw new Error(`Unknown calculation: ${operand.calculationId}`);
      }
      return value;
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

  if (expression.type === "aggregate") {
    const values = filledAggregateArgs(expression.args).map((arg) =>
      evaluateBlockExpression(arg, context),
    );
    return applyAggregateFunction(expression.function, values);
  }

  if (expression.type === "rowAggregate") {
    const values = evaluateRowAggregateValues(expression, context);
    return applyAggregateFunction(expression.function, values);
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
