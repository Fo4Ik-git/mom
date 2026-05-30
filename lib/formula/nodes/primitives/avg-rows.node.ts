import type { FormulaPrimitiveDefinition } from "@/lib/formula/nodes/_definition";
import {
  evalRowInnerValues,
  formatRowAggregateCode,
  formatRowAggregateLabel,
  parseRowAggregateCall,
  rowAggregateCompletion,
  rowAggregatePaletteItems,
} from "@/lib/formula/nodes/_helpers";

const FN = "AVG" as const;
const KEYWORD = "AVG_ROWS";

export const avgRowsPrimitive: FormulaPrimitiveDefinition = {
  id: "avg-rows",
  astType: "rowAggregate",
  matchNode: (node) => node.type === "rowAggregate" && node.function === FN,
  call: { keyword: KEYWORD },
  evaluate: (node, context, evaluateChild) => {
    if (node.type !== "rowAggregate" || node.function !== FN) {
      return 0;
    }
    const values = evalRowInnerValues(node, context, evaluateChild);
    if (values.length === 0) {
      return 0;
    }
    const total = values.reduce((sum, value) => sum + value, 0);
    return total / values.length;
  },
  formatCode: (node, ctx) => formatRowAggregateCode(KEYWORD, node, ctx),
  formatLabel: (node, ctx) => formatRowAggregateLabel(FN, node, ctx),
  parseCodeCall: (ident, ctx) => parseRowAggregateCall(ident, FN, ctx),
  paletteItems: (ctx) => rowAggregatePaletteItems(FN, ctx),
  completions: () => [rowAggregateCompletion(FN)],
};
