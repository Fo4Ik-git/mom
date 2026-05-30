import type {
  BlockExpression,
} from "@/types/calculator";
import { formatExpressionViaRegistry } from "@/lib/formula/nodes/registry";
import type { FormulaTarget } from "@/lib/formula/core/formula-target";
import type { FormulaLocal } from "@/types/calculator";
import { formatFormulaProgram } from "@/lib/formula/code/formula-program";

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
  locals?: FormulaLocal[],
): string {
  return formatFormulaProgram({ expression, locals: locals ?? [] }, target);
}
