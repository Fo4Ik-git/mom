import type {
  AggregateFunction,
  BlockExpression,
  BlockOperand,
  FormulaOperator,
} from "@/types/calculator";
import { normalizeAggregateArgs } from "@/lib/formula/core/aggregate-helpers";

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

export function lineColumnOperand(
  fieldId: string,
  propertyId: string,
): BlockExpression {
  return operandExpression({ kind: "lineColumn", fieldId, propertyId });
}

export function lineColumnTimesColumn(
  fieldId: string,
  leftPropertyId: string,
  rightPropertyId: string,
): BlockExpression {
  return operationExpression(
    "*",
    lineColumnOperand(fieldId, leftPropertyId),
    lineColumnOperand(fieldId, rightPropertyId),
  );
}

export function rowAggregateExpression(
  fieldId: string,
  fn: AggregateFunction,
  inner: BlockExpression,
): BlockExpression {
  return { type: "rowAggregate", fieldId, function: fn, inner };
}

export function aggregateExpression(
  fn: AggregateFunction,
  operands: BlockExpression[],
): BlockExpression {
  const filled = operands.filter((operand) => operand.type !== "empty");
  if (filled.length === 0) {
    return { type: "empty" };
  }
  return {
    type: "aggregate",
    function: fn,
    args: normalizeAggregateArgs(filled),
  };
}

export function sumCalculationOperands(calculationIds: string[]): BlockExpression {
  const unique = [...new Set(calculationIds)];
  if (unique.length === 0) {
    return { type: "empty" };
  }
  return aggregateExpression(
    "SUM",
    unique.map((id) => calculationOperand(id)),
  );
}

export function sumExpressions(operands: BlockExpression[]): BlockExpression {
  if (operands.length === 0) {
    return { type: "empty" };
  }
  return aggregateExpression("SUM", operands);
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

export function marginFromCalculationSums(
  revenueIds: string[],
  costIds: string[],
): BlockExpression {
  const revenue = sumCalculationOperands(revenueIds);
  const cost = sumCalculationOperands(costIds);
  if (revenue.type === "empty" || cost.type === "empty") {
    return { type: "empty" };
  }
  return operationExpression("-", revenue, cost);
}
