import type { FormulaPrimitiveDefinition } from "@/lib/formula/nodes/_definition";
import {
  evalRowInnerValues,
  formatRowAggregateCode,
  formatRowAggregateLabel,
  parseRowAggregateCall,
  rowAggregateCompletion,
  rowAggregatePaletteItems,
} from "@/lib/formula/nodes/_helpers";

const FN = "SUM" as const;
const KEYWORD = "SUM_ROWS";

export const sumRowsPrimitive: FormulaPrimitiveDefinition = {
  id: "sum-rows",
  astType: "rowAggregate",
  matchNode: (node) => node.type === "rowAggregate" && node.function === FN,
  call: { keyword: KEYWORD },
  evaluate: (node, context, evaluateChild) => {
    if (node.type !== "rowAggregate" || node.function !== FN) {
      return 0;
    }
    const values = evalRowInnerValues(node, context, evaluateChild);
    return values.reduce((total, value) => total + value, 0);
  },
  formatCode: (node, ctx) => formatRowAggregateCode(KEYWORD, node, ctx),
  formatLabel: (node, ctx) => formatRowAggregateLabel(FN, node, ctx),
  parseCodeCall: (ident, ctx) => parseRowAggregateCall(ident, FN, ctx),
  paletteItems: (ctx) => rowAggregatePaletteItems(FN, ctx),
  completions: () => [rowAggregateCompletion(FN)],
};
