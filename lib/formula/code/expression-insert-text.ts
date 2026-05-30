import type { BlockExpression } from "@/types/calculator";
import { formatFormulaCode } from "@/lib/formula/code/code-format";

/** Script-mode insert text for a block expression (calculations / outputs tabs). */
export function formatExpressionForScriptInsert(
  expression: BlockExpression,
): string {
  return formatFormulaCode(expression, { fieldId: "__script__" });
}
