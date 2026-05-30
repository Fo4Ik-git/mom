import { collectTotalOperands } from "@/lib/formula/core/collect-total-operands";
import {
  costLike,
  priceLike,
} from "@/lib/formula/core/property-matchers";
import {
  operationExpression,
  sumExpressions,
} from "@/lib/formula/core/expression-builders";
import type {
  BlockExpression,
  CalculatorConfig,
  OutputField,
} from "@/types/calculator";
import { emptyBlockExpression } from "@/types/calculator";

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export type OutputSnippetId = "sumCost" | "sumPrice" | "margin";

export function buildOutputFromSnippet(
  config: CalculatorConfig,
  snippetId: OutputSnippetId,
  labels: { sumCost: string; sumPrice: string; margin: string },
): OutputField | null {
  const costOperands = collectTotalOperands(config, costLike);
  const priceOperands = collectTotalOperands(config, priceLike);

  let expression: BlockExpression = emptyBlockExpression();
  let label = "";

  switch (snippetId) {
    case "sumCost":
      if (costOperands.length === 0) {
        return null;
      }
      expression = sumExpressions(costOperands);
      label = labels.sumCost;
      break;
    case "sumPrice":
      if (priceOperands.length === 0) {
        return null;
      }
      expression = sumExpressions(priceOperands);
      label = labels.sumPrice;
      break;
    case "margin":
      if (costOperands.length === 0 || priceOperands.length === 0) {
        return null;
      }
      expression = operationExpression(
        "-",
        sumExpressions(priceOperands),
        sumExpressions(costOperands),
      );
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
