import type { BlockExpression } from "@/types/calculator";
import {
  emptyAggregateExpression,
  emptyBlockExpression,
  emptyConditionalExpression,
  emptyRoundExpression,
  emptyRowAggregateExpression,
} from "@/types/calculator";
import type { PaletteDragData } from "@/lib/formula/blocks/block-tree";

/** Create a block AST node from a palette drag payload (formula registry dispatch). */
export function createExpressionFromPaletteDrag(
  item: Extract<PaletteDragData, { source: "palette" }>,
): BlockExpression | null {
  switch (item.kind) {
    case "group":
      return { type: "group", inner: emptyBlockExpression() };
    case "aggregate":
      return emptyAggregateExpression(item.function);
    case "rowAggregate":
      return emptyRowAggregateExpression(item.fieldId, item.function);
    case "conditional":
      return emptyConditionalExpression();
    case "round":
      return emptyRoundExpression();
    default:
      return null;
  }
}
