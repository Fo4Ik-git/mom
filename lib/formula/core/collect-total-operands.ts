import type { BlockExpression, CalculatorConfig, InputProperty } from "@/types/calculator";
import { autoCalculationId } from "@/lib/calculator/config/auto-calculations";
import {
  isLineItemsField,
  lineItemAutoCalculationInner,
} from "@/lib/calculator/fields/line-items";
import {
  isTimeField,
  timeServiceCalculationId,
} from "@/lib/calculator/fields/time-service";
import {
  calculationOperand,
  quantityTimesProperty,
  rowAggregateExpression,
} from "@/lib/formula/core/expression-builders";

function existingCalculationIds(config: CalculatorConfig): Set<string> {
  return new Set((config.calculations ?? []).map((calc) => calc.id));
}

/**
 * Operands for “sum all costs/prices” snippets: every matching field, preferring
 * auto-calculation refs when present, otherwise qty × property.
 */
export function collectTotalOperands(
  config: CalculatorConfig,
  match: (property: InputProperty) => boolean,
): BlockExpression[] {
  const calcIds = existingCalculationIds(config);
  const operands: BlockExpression[] = [];

  for (const input of config.inputs) {
    if (isTimeField(input) && input.timeAutoTotal !== false) {
      const timeId = timeServiceCalculationId(input.id);
      if (calcIds.has(timeId)) {
        operands.push(calculationOperand(timeId));
      }
      continue;
    }

    if (isLineItemsField(input)) {
      for (const property of input.properties) {
        if (!match(property)) {
          continue;
        }
        const id = autoCalculationId(input.id, property.id);
        if (calcIds.has(id)) {
          operands.push(calculationOperand(id));
        } else {
          operands.push(
            rowAggregateExpression(
              input.id,
              "SUM",
              lineItemAutoCalculationInner(input, property),
            ),
          );
        }
      }
      continue;
    }

    for (const property of input.properties) {
      if (!match(property)) {
        continue;
      }
      const id = autoCalculationId(input.id, property.id);
      if (calcIds.has(id)) {
        operands.push(calculationOperand(id));
      } else {
        operands.push(quantityTimesProperty(input.id, property.id));
      }
    }
  }

  return operands;
}
