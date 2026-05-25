import { autoCalculationId } from "@/lib/calculator/auto-calculations";
import {
  isTimeField,
  timeServiceCalculationId,
} from "@/lib/calculator/time-service";
import {
  calculationMinusCalculation,
  marginFromCalculationSums,
  sumCalculationOperands,
} from "@/lib/formula/expression-builders";
import type {
  BlockExpression,
  CalculatorConfig,
  InputProperty,
  OutputField,
} from "@/types/calculator";
import { emptyBlockExpression } from "@/types/calculator";

function costLike(property: InputProperty) {
  return (
    /собів|собест|cost|себест/i.test(property.label) ||
    property.id.includes("cost")
  );
}

function priceLike(property: InputProperty) {
  return (
    /ціна|price|варт|rate|тариф|стоим/i.test(property.label) ||
    property.id.includes("price")
  );
}

function collectAutoTotalCalculationIds(
  config: CalculatorConfig,
  match: (property: InputProperty) => boolean,
) {
  const calcIds = new Set((config.calculations ?? []).map((calc) => calc.id));
  const ids: string[] = [];

  for (const input of config.inputs) {
    if (isTimeField(input) && input.timeAutoTotal !== false) {
      const timeId = timeServiceCalculationId(input.id);
      if (calcIds.has(timeId)) {
        ids.push(timeId);
      }
      continue;
    }

    for (const property of input.properties) {
      if (!property.autoTotal || !match(property)) {
        continue;
      }
      const id = autoCalculationId(input.id, property.id);
      if (calcIds.has(id)) {
        ids.push(id);
      }
    }
  }

  return ids;
}

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export type OutputSnippetId = "sumCost" | "sumPrice" | "margin";

export function buildOutputFromSnippet(
  config: CalculatorConfig,
  snippetId: OutputSnippetId,
  labels: { sumCost: string; sumPrice: string; margin: string },
): OutputField | null {
  const costIds = collectAutoTotalCalculationIds(config, costLike);
  const priceIds = collectAutoTotalCalculationIds(config, priceLike);

  let expression: BlockExpression = emptyBlockExpression();
  let label = "";

  switch (snippetId) {
    case "sumCost":
      if (costIds.length === 0) {
        return null;
      }
      expression = sumCalculationOperands(costIds);
      label = labels.sumCost;
      break;
    case "sumPrice":
      if (priceIds.length === 0) {
        return null;
      }
      expression = sumCalculationOperands(priceIds);
      label = labels.sumPrice;
      break;
    case "margin":
      if (costIds.length === 0 || priceIds.length === 0) {
        return null;
      }
      expression =
        costIds.length === 1 && priceIds.length === 1
          ? calculationMinusCalculation(priceIds[0], costIds[0])
          : marginFromCalculationSums(priceIds, costIds);
      label = labels.margin;
      break;
    default:
      return null;
  }

  return {
    id: randomId("output"),
    label,
    expression,
    highlight: snippetId === "margin",
  };
}
