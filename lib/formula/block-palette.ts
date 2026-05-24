import type { BlockOperand, CalculatorConfig, FormulaOperator } from "@/types/calculator";

export type PaletteBlock = {
  id: string;
  label: string;
  category: "operand" | "operator" | "constant" | "group";
  color: "quantity" | "property" | "output" | "operator" | "constant" | "group";
  dragData:
    | { kind: "operand"; operand: BlockOperand }
    | { kind: "operator"; operator: FormulaOperator }
    | { kind: "group" };
};

export function buildPaletteBlocks(
  config: CalculatorConfig,
  outputIndex: number,
  quantityLabel: string,
): PaletteBlock[] {
  const blocks: PaletteBlock[] = [];

  for (const input of config.inputs) {
    blocks.push({
      id: `q-${input.id}`,
      label: `${input.label} · ${quantityLabel}`,
      category: "operand",
      color: "quantity",
      dragData: {
        kind: "operand",
        operand: { kind: "quantity", fieldId: input.id },
      },
    });

    for (const property of input.properties) {
      blocks.push({
        id: `p-${input.id}-${property.id}`,
        label: `${input.label} · ${property.label}`,
        category: "operand",
        color: "property",
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

  config.outputs.slice(0, outputIndex).forEach((output) => {
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
  });

  (config.constants ?? []).forEach((constant) => {
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
  });

  (["+", "-", "*", "/"] as FormulaOperator[]).forEach((operator) => {
    blocks.push({
      id: `op-${operator}`,
      label: operator === "*" ? "×" : operator === "/" ? "÷" : operator,
      category: "operator",
      color: "operator",
      dragData: { kind: "operator", operator },
    });
  });

  blocks.push({
    id: "group-wrap",
    label: "( )",
    category: "group",
    color: "group",
    dragData: { kind: "group" },
  });

  return blocks;
}

export const BLOCK_COLORS = {
  quantity: "bg-sky-500/15 text-sky-800 border-sky-400/50 dark:text-sky-200",
  property: "bg-accent/15 text-accent border-accent/40",
  output: "bg-emerald-500/15 text-emerald-800 border-emerald-400/50 dark:text-emerald-200",
  operator: "bg-amber-500/20 text-amber-900 border-amber-400/60 dark:text-amber-100",
  constant: "bg-violet-500/15 text-violet-800 border-violet-400/50 dark:text-violet-200",
  group: "bg-violet-500/10 text-violet-800 border-violet-400/40 dark:text-violet-200",
  number: "bg-muted text-foreground border-border",
  empty: "border-dashed border-border bg-card/50 text-muted-foreground",
};
