import type { FormulaNodeDefinition } from "@/lib/formula/nodes/_definition";

export const emptyNode: FormulaNodeDefinition<"empty"> = {
  type: "empty",
  evaluate: () => 0,
  formatLabel: () => "…",
};
