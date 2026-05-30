import { isAutoCalculationId } from "@/lib/calculator/config/auto-calculations";
import { isLineItemsField, rowAggregateLabel } from "@/lib/calculator/fields/line-items";
import type { PaletteBlock } from "@/lib/formula/blocks/block-palette-types";
import type {
  FormulaDisplayContext,
  FormulaPaletteContext,
} from "@/lib/formula/nodes/_definition";
import { getInputById, getPropertyLabel } from "@/lib/formula/core/operand-labels";
import type { BlockOperand } from "@/types/calculator";

export function buildReferencePaletteItems(
  ctx: FormulaPaletteContext,
): PaletteBlock[] {
  const { config, target, quantityLabel, rowsLabel } = ctx;
  const blocks: PaletteBlock[] = [];

  for (const input of config.inputs) {
    const label = input.label.trim() || "…";

    if (isLineItemsField(input)) {
      for (const property of input.properties) {
        blocks.push({
          id: `lc-${input.id}-${property.id}`,
          label: `${label} · ${property.label}`,
          category: "operand",
          color: "lineColumn",
          meta: {
            groupId: input.id,
            groupLabel: label,
            title: property.label,
            hint: rowsLabel,
          },
          dragData: {
            kind: "operand",
            operand: {
              kind: "lineColumn",
              fieldId: input.id,
              propertyId: property.id,
            },
          },
        });
      }
      continue;
    }

    blocks.push({
      id: `q-${input.id}`,
      label: `${label} · ${quantityLabel}`,
      category: "operand",
      color: "quantity",
      meta: {
        groupId: input.id,
        groupLabel: label,
        title: quantityLabel,
        hint: label,
      },
      dragData: {
        kind: "operand",
        operand: { kind: "quantity", fieldId: input.id },
      },
    });

    for (const property of input.properties) {
      blocks.push({
        id: `p-${input.id}-${property.id}`,
        label: `${label} · ${property.label}`,
        category: "operand",
        color: "property",
        meta: {
          groupId: input.id,
          groupLabel: label,
          title: property.label,
          hint: label,
        },
        dragData: {
          kind: "operand",
          operand: {
            kind: "property",
            fieldId: input.id,
            propertyId: property.id,
          },
        },
      });
    }
  }

  for (const calculation of config.calculations ?? []) {
    if (isAutoCalculationId(calculation.id)) {
      continue;
    }
    if (calculation.id === target.fieldId) {
      continue;
    }
    blocks.push({
      id: `k-${calculation.id}`,
      label: calculation.label,
      category: "operand",
      color: "calculation",
      meta: { title: calculation.label },
      dragData: {
        kind: "operand",
        operand: { kind: "calculation", calculationId: calculation.id },
      },
    });
  }

  for (const output of config.outputs) {
    if (output.id === target.fieldId) {
      continue;
    }
    blocks.push({
      id: `o-${output.id}`,
      label: output.label,
      category: "operand",
      color: "output",
      dragData: {
        kind: "operand",
        operand: { kind: "output", outputId: output.id },
      },
    });
  }

  for (const constant of config.constants ?? []) {
    blocks.push({
      id: `c-${constant.id}`,
      label: `${constant.label} = ${constant.value}`,
      category: "constant",
      color: "constant",
      dragData: {
        kind: "operand",
        operand: { kind: "constant", constantId: constant.id },
      },
    });
  }

  return blocks;
}

export function formatBlockOperandLabel(
  operand: BlockOperand,
  ctx: FormulaDisplayContext,
): string {
  const { config, target, quantityLabel } = ctx;

  switch (operand.kind) {
    case "quantity": {
      const input = getInputById(config, operand.fieldId);
      return input ? `${input.label} · ${quantityLabel}` : "?";
    }
    case "property": {
      const input = getInputById(config, operand.fieldId);
      if (!input) {
        return "?";
      }
      return `${input.label} · ${getPropertyLabel(input, operand.propertyId)}`;
    }
    case "lineColumn": {
      const input = getInputById(config, operand.fieldId);
      if (!input) {
        return "?";
      }
      const column = getPropertyLabel(input, operand.propertyId);
      return isLineItemsField(input)
        ? `${column} (row)`
        : `${input.label} · ${column}`;
    }
    case "calculation": {
      if (operand.calculationId === target.fieldId) {
        return "?";
      }
      const calculation = (config.calculations ?? []).find(
        (item) => item.id === operand.calculationId,
      );
      return calculation?.label ?? "?";
    }
    case "output": {
      if (operand.outputId === target.fieldId) {
        return "?";
      }
      const output = config.outputs.find((item) => item.id === operand.outputId);
      return output?.label ?? "?";
    }
    case "number":
      return String(operand.value);
    case "constant": {
      const constant = (config.constants ?? []).find(
        (item) => item.id === operand.constantId,
      );
      return constant ? constant.label : "?";
    }
    case "local":
      return operand.localId;
    default:
      return "?";
  }
}
