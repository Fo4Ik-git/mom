import type {
  BlockExpression,
  BlockOperand,
  CalculatorConfig,
} from "@/types/calculator";
import type { FormulaTarget } from "@/lib/formula/core/formula-target";
import {
  formatExpressionLabelViaRegistry,
  mergePaletteItems,
} from "@/lib/formula/nodes/registry";
import { formatBlockOperandLabel } from "@/lib/formula/nodes/reference-operands";

export type {
  PaletteBlock,
} from "@/lib/formula/blocks/block-palette-types";

export { BLOCK_COLORS } from "@/lib/formula/blocks/block-palette-types";

export function buildPaletteBlocks(
  config: CalculatorConfig,
  target: FormulaTarget,
  quantityLabel: string,
  rowsLabel = "rows",
) {
  return mergePaletteItems({
    config,
    target,
    quantityLabel,
    rowsLabel,
  });
}

export function formatBlockOperand(
  operand: BlockOperand,
  config: CalculatorConfig,
  target: FormulaTarget,
  quantityLabel: string,
): string {
  return formatBlockOperandLabel(operand, {
    config,
    target,
    quantityLabel,
    formatChild: (expression) =>
      formatBlockExpression(expression, config, target, quantityLabel),
  });
}

export function formatBlockExpression(
  expression: BlockExpression,
  config: CalculatorConfig,
  target: FormulaTarget,
  quantityLabel: string,
): string {
  return formatExpressionLabelViaRegistry(expression, {
    config,
    target,
    quantityLabel,
  });
}
