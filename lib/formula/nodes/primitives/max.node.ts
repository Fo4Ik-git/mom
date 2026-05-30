import type { FormulaPrimitiveDefinition } from "@/lib/formula/nodes/_definition";
import {
  aggregatePaletteItem,
  evalAggregateArgValues,
  formatAggregateCode,
  formatAggregateLabel,
  parseAggregateCall,
} from "@/lib/formula/nodes/_helpers";

const KEYWORD = "MAX" as const;

export const maxPrimitive: FormulaPrimitiveDefinition = {
  id: "max",
  astType: "aggregate",
  matchNode: (node) => node.type === "aggregate" && node.function === KEYWORD,
  call: { keyword: KEYWORD },
  evaluate: (node, context, evaluateChild) => {
    if (node.type !== "aggregate" || node.function !== KEYWORD) {
      return 0;
    }
    const values = evalAggregateArgValues(node, context, evaluateChild);
    if (values.length === 0) {
      return 0;
    }
    return Math.max(...values);
  },
  formatCode: (node, ctx) => formatAggregateCode(KEYWORD, node, ctx),
  formatLabel: (node, ctx) => formatAggregateLabel(KEYWORD, node, ctx),
  parseCodeCall: (keyword, ctx) => parseAggregateCall(keyword, KEYWORD, ctx),
  paletteItems: () => [aggregatePaletteItem(KEYWORD)],
};
