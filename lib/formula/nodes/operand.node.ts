import type { BlockOperand } from "@/types/calculator";
import type { FormulaNodeDefinition } from "@/lib/formula/nodes/_definition";
import {
  buildReferencePaletteItems,
  formatBlockOperandLabel,
} from "@/lib/formula/nodes/reference-operands";
import { getPropertyValue } from "@/lib/formula/nodes/_shared";

function evaluateOperand(
  operand: BlockOperand,
  context: Parameters<FormulaNodeDefinition<"operand">["evaluate"]>[1],
): number {
  switch (operand.kind) {
    case "quantity":
      return context.quantities[operand.fieldId] ?? 0;
    case "property": {
      const input = context.inputs.find((f) => f.id === operand.fieldId);
      if (!input) {
        throw new Error(`Unknown field: ${operand.fieldId}`);
      }
      return getPropertyValue(input.properties, operand.propertyId);
    }
    case "lineColumn": {
      if (context.currentLineRow) {
        return context.currentLineRow[operand.propertyId] ?? 0;
      }
      const input = context.inputs.find((f) => f.id === operand.fieldId);
      if (!input) {
        throw new Error(`Unknown line items field: ${operand.fieldId}`);
      }
      return getPropertyValue(input.properties, operand.propertyId);
    }
    case "calculation": {
      const value = context.calculations[operand.calculationId];
      if (value === undefined) {
        throw new Error(`Unknown calculation: ${operand.calculationId}`);
      }
      return value;
    }
    case "output": {
      const value = context.outputs[operand.outputId];
      if (value === undefined) {
        throw new Error(`Unknown output: ${operand.outputId}`);
      }
      return value;
    }
    case "number":
      return operand.value;
    case "constant": {
      const constant = context.constants.find((c) => c.id === operand.constantId);
      if (!constant) {
        throw new Error(`Unknown constant: ${operand.constantId}`);
      }
      return constant.value;
    }
    case "local": {
      const value = context.locals?.[operand.localId];
      if (value === undefined) {
        throw new Error(`Unknown local variable: ${operand.localId}`);
      }
      return value;
    }
    case "macro": {
      const value = context.macros?.[operand.macroId];
      if (value === undefined) {
        throw new Error(`Unknown macro: ${operand.macroId}`);
      }
      return value;
    }
    default: {
      const _exhaustive: never = operand;
      throw new Error(`Unknown operand kind: ${(_exhaustive as BlockOperand).kind}`);
    }
  }
}

export const operandNode: FormulaNodeDefinition<"operand"> = {
  type: "operand",
  evaluate: (node, context) => evaluateOperand(node.operand, context),
  formatCode: (node, ctx) => ctx.formatOperand(node.operand, ctx.rowFieldId),
  formatLabel: (node, ctx) => formatBlockOperandLabel(node.operand, ctx),
  paletteItems: buildReferencePaletteItems,
};
