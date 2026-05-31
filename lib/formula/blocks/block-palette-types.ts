import type {
  AggregateFunction,
  BlockExpression,
  BlockOperand,
  FormulaOperator,
} from "@/types/calculator";
import type { FormulaSnippetPick } from "@/lib/formula/core/formula-snippets";

export type PaletteBlock = {
  id: string;
  label: string;
  category: "operand" | "operator" | "constant" | "group" | "snippet" | "aggregate" | "rowAggregate" | "conditional" | "round";
  color:
    | "quantity"
    | "property"
    | "lineColumn"
    | "output"
    | "calculation"
    | "operator"
    | "constant"
    | "macro"
    | "group"
    | "snippet"
    | "aggregate"
    | "rowAggregate"
    | "conditional"
    | "round";
  dragData:
    | { kind: "operand"; operand: BlockOperand }
    | { kind: "operator"; operator: FormulaOperator }
    | { kind: "group" }
    | { kind: "aggregate"; function: AggregateFunction }
    | { kind: "rowAggregate"; fieldId: string; function: AggregateFunction }
    | { kind: "conditional" }
    | { kind: "round" }
    | { kind: "expression"; expression: BlockExpression };
  pick?: FormulaSnippetPick;
  meta?: {
    groupId?: string;
    groupLabel?: string;
    title?: string;
    hint?: string;
  };
};

export const BLOCK_COLORS = {
  quantity: "bg-sky-500/15 text-sky-800 border-sky-400/50 dark:text-sky-200",
  property: "bg-accent/15 text-accent border-accent/40",
  output: "bg-emerald-500/15 text-emerald-800 border-emerald-400/50 dark:text-emerald-200",
  calculation:
    "bg-orange-500/15 text-orange-800 border-orange-400/50 dark:text-orange-200",
  operator: "bg-amber-500/20 text-amber-900 border-amber-400/60 dark:text-amber-100",
  constant: "bg-violet-500/15 text-violet-800 border-violet-400/50 dark:text-violet-200",
  macro: "bg-purple-500/15 text-purple-800 border-purple-400/50 dark:text-purple-200",
  group: "bg-violet-500/10 text-violet-800 border-violet-400/40 dark:text-violet-200",
  number: "bg-muted text-foreground border-border",
  snippet:
    "bg-teal-500/15 text-teal-900 border-teal-400/50 dark:text-teal-100",
  aggregate:
    "bg-fuchsia-500/15 text-fuchsia-900 border-fuchsia-400/50 dark:text-fuchsia-100",
  lineColumn:
    "bg-cyan-500/15 text-cyan-900 border-cyan-400/50 dark:text-cyan-100",
  rowAggregate:
    "bg-indigo-500/15 text-indigo-900 border-indigo-400/50 dark:text-indigo-100",
  conditional:
    "bg-rose-500/15 text-rose-900 border-rose-400/50 dark:text-rose-100",
  round:
    "bg-lime-500/15 text-lime-900 border-lime-400/50 dark:text-lime-100",
  empty: "border-dashed border-border bg-card/50 text-muted-foreground",
};
