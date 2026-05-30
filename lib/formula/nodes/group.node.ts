import type { FormulaNodeDefinition } from "@/lib/formula/nodes/_definition";

export const groupNode: FormulaNodeDefinition<"group"> = {
  type: "group",
  evaluate: (node, context, evaluateChild) =>
    evaluateChild(node.inner, context),
  formatCode: (node, ctx) =>
    `(${ctx.formatChild(node.inner, { rowFieldId: ctx.rowFieldId })})`,
  formatLabel: (node, ctx) => `(${ctx.formatChild(node.inner)})`,
  paletteItems: () => [
    {
      id: "group-wrap",
      label: "( )",
      category: "group",
      color: "group",
      dragData: { kind: "group" },
    },
  ],
};
