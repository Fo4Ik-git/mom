import type {
  AggregateFunction,
  BlockOperand,
  BlockExpression,
  CalculatorConfig,
  FormulaOperator,
} from "@/types/calculator";
import { AGGREGATE_FUNCTIONS } from "@/types/calculator";
import { isAutoCalculationId } from "@/lib/calculator/auto-calculations";
import type { FormulaTarget } from "@/lib/formula/formula-target";
import type { FormulaSnippetPick } from "@/lib/formula/formula-snippets";

export type PaletteBlock = {
  id: string;
  label: string;
  category: "operand" | "operator" | "constant" | "group" | "snippet" | "aggregate";
  color:
    | "quantity"
    | "property"
    | "output"
    | "calculation"
    | "operator"
    | "constant"
    | "group"
    | "snippet"
    | "aggregate";
  dragData:
    | { kind: "operand"; operand: BlockOperand }
    | { kind: "operator"; operator: FormulaOperator }
    | { kind: "group" }
    | { kind: "aggregate"; function: AggregateFunction }
    | { kind: "expression"; expression: BlockExpression };
  pick?: FormulaSnippetPick;
  meta?: {
    groupId?: string;
    groupLabel?: string;
    title?: string;
    hint?: string;
  };
};

export function buildPaletteBlocks(
  config: CalculatorConfig,
  target: FormulaTarget,
  quantityLabel: string,
): PaletteBlock[] {
  const blocks: PaletteBlock[] = [];

  for (const input of config.inputs) {
    const label = input.label.trim() || "…";
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

  for (const fn of AGGREGATE_FUNCTIONS) {
    blocks.push({
      id: `agg-${fn}`,
      label: fn,
      category: "aggregate",
      color: "aggregate",
      meta: {
        title: fn,
        hint: `${fn}( … )`,
      },
      dragData: { kind: "aggregate", function: fn },
    });
  }

  return blocks;
}

export const BLOCK_COLORS = {
  quantity: "bg-sky-500/15 text-sky-800 border-sky-400/50 dark:text-sky-200",
  property: "bg-accent/15 text-accent border-accent/40",
  output: "bg-emerald-500/15 text-emerald-800 border-emerald-400/50 dark:text-emerald-200",
  calculation:
    "bg-orange-500/15 text-orange-800 border-orange-400/50 dark:text-orange-200",
  operator: "bg-amber-500/20 text-amber-900 border-amber-400/60 dark:text-amber-100",
  constant: "bg-violet-500/15 text-violet-800 border-violet-400/50 dark:text-violet-200",
  group: "bg-violet-500/10 text-violet-800 border-violet-400/40 dark:text-violet-200",
  number: "bg-muted text-foreground border-border",
  snippet:
    "bg-teal-500/15 text-teal-900 border-teal-400/50 dark:text-teal-100",
  aggregate:
    "bg-fuchsia-500/15 text-fuchsia-900 border-fuchsia-400/50 dark:text-fuchsia-100",
  empty: "border-dashed border-border bg-card/50 text-muted-foreground",
};
