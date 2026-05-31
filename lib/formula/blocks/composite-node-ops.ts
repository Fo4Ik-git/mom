import type { BlockExpression } from "@/types/calculator";
import { emptyBlockExpression } from "@/types/calculator";
import {
  getCompositeBlockUi,
  isCompositeExpressionType,
} from "@/lib/formula/nodes/block-ui-registry";

export function isCompositeSlotKey(
  type: BlockExpression["type"],
  slot: string,
): boolean {
  const ui = getCompositeBlockUi(type);
  return ui?.slots.some((item) => item.key === slot) ?? false;
}

export function readCompositeSlot(
  node: BlockExpression,
  slot: string,
): BlockExpression {
  if (!isCompositeExpressionType(node.type)) {
    return emptyBlockExpression();
  }
  const record = node as unknown as Record<string, BlockExpression>;
  return record[slot] ?? emptyBlockExpression();
}

export function writeCompositeSlot(
  node: BlockExpression,
  slot: string,
  value: BlockExpression,
): BlockExpression {
  if (!isCompositeExpressionType(node.type)) {
    return node;
  }
  return { ...node, [slot]: value };
}

export function isCompositeExpressionFilled(
  expression: BlockExpression,
  isFilled: (expr: BlockExpression) => boolean,
): boolean {
  const ui = getCompositeBlockUi(expression.type);
  if (!ui) {
    return false;
  }
  return ui.slots.some((slot) => isFilled(readCompositeSlot(expression, slot.key)));
}

/** First slot with empty child, else last slot key (for palette drop). */
export function firstEmptyCompositeSlot(node: BlockExpression): string | null {
  const ui = getCompositeBlockUi(node.type);
  if (!ui) {
    return null;
  }
  for (const slot of ui.slots) {
    if (readCompositeSlot(node, slot.key).type === "empty") {
      return slot.key;
    }
  }
  return ui.slots[ui.slots.length - 1]?.key ?? null;
}

export function unwrapCompositeNode(
  node: BlockExpression,
  isFilled: (expr: BlockExpression) => boolean,
): BlockExpression {
  const ui = getCompositeBlockUi(node.type);
  if (!ui) {
    return emptyBlockExpression();
  }
  for (const slot of ui.unwrapSlotPriority) {
    const child = readCompositeSlot(node, slot);
    if (isFilled(child)) {
      return child;
    }
  }
  return emptyBlockExpression();
}
