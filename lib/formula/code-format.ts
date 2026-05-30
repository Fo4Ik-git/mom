import type {
  BlockExpression,
  BlockOperand,
} from "@/types/calculator";
import { formatExpressionViaRegistry } from "@/lib/formula/nodes/registry";
import type { FormulaTarget } from "@/lib/formula/formula-target";

export function formatFormulaCode(
  expression: BlockExpression,
  target: FormulaTarget,
  options?: { rowFieldId?: string },
): string {
  return formatExpressionViaRegistry(expression, target, options);
}

export function formatFormulaCodeBlock(
  expression: BlockExpression,
  target: FormulaTarget,
): string {
  const body = formatFormulaCode(expression, target);
  return body || "// empty";
}
