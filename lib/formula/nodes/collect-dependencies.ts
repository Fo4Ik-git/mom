import type { BlockExpression } from "@/types/calculator";
import { filledAggregateArgs } from "@/lib/formula/aggregate-helpers";
import {
  fieldRefsFromOperand,
  type FormulaFieldRef,
} from "@/lib/formula/nodes/reference-code";

export function collectExpressionFieldRefs(
  expression: BlockExpression,
): FormulaFieldRef[] {
  const refs: FormulaFieldRef[] = [];

  function walk(node: BlockExpression) {
    if (node.type === "empty") {
      return;
    }
    if (node.type === "operand") {
      refs.push(...fieldRefsFromOperand(node.operand));
      return;
    }
    if (node.type === "group") {
      walk(node.inner);
      return;
    }
    if (node.type === "aggregate") {
      for (const arg of filledAggregateArgs(node.args)) {
        walk(arg);
      }
      return;
    }
    if (node.type === "rowAggregate") {
      walk(node.inner);
      return;
    }
    if (node.type === "operation") {
      walk(node.left);
      walk(node.right);
    }
  }

  walk(expression);
  return refs;
}

export type { FormulaFieldRef };
