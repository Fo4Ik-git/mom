import type { BlockExpression, BlockOperand, FormulaOperator } from "@/types/calculator";

export function operandExpression(operand: BlockOperand): BlockExpression {
  return { type: "operand", operand };
}

export function operationExpression(
  operator: FormulaOperator,
  left: BlockExpression,
  right: BlockExpression,
): BlockExpression {
  return { type: "operation", operator, left, right };
}

export function groupExpression(inner: BlockExpression): BlockExpression {
  return { type: "group", inner };
}

export function quantityTimesProperty(
  fieldId: string,
  propertyId: string,
): BlockExpression {
  return operationExpression(
    "*",
    operandExpression({ kind: "property", fieldId, propertyId }),
    operandExpression({ kind: "quantity", fieldId }),
  );
}

export function propertyMinusProperty(
  fieldId: string,
  leftPropertyId: string,
  rightPropertyId: string,
): BlockExpression {
  return operationExpression(
    "-",
    operandExpression({ kind: "property", fieldId, propertyId: leftPropertyId }),
    operandExpression({ kind: "property", fieldId, propertyId: rightPropertyId }),
  );
}

export function propertyTimesConstant(
  fieldId: string,
  propertyId: string,
  constantId: string,
): BlockExpression {
  return operationExpression(
    "*",
    operandExpression({ kind: "property", fieldId, propertyId }),
    operandExpression({ kind: "constant", constantId }),
  );
}

export function propertyDivNumberThenTimes(
  fieldId: string,
  propertyId: string,
  divisor: number,
  multiplier: BlockExpression,
): BlockExpression {
  return operationExpression(
    "*",
    operationExpression(
      "/",
      operandExpression({ kind: "property", fieldId, propertyId }),
      operandExpression({ kind: "number", value: divisor }),
    ),
    multiplier,
  );
}

export function calculationOperand(calculationId: string): BlockExpression {
  return operandExpression({ kind: "calculation", calculationId });
}

export function sumCalculationOperands(calculationIds: string[]): BlockExpression {
  const unique = [...new Set(calculationIds)];
  if (unique.length === 0) {
    return { type: "empty" };
  }
  return unique.slice(1).reduce<BlockExpression>(
    (left, id) => operationExpression("+", left, calculationOperand(id)),
    calculationOperand(unique[0]),
  );
}

export function calculationMinusCalculation(
  leftCalculationId: string,
  rightCalculationId: string,
): BlockExpression {
  return operationExpression(
    "-",
    calculationOperand(leftCalculationId),
    calculationOperand(rightCalculationId),
  );
}
