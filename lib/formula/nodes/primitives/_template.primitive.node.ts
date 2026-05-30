/**
 * Template: copy to `my-fn.node.ts` and register in `primitives/index.ts`.
 *
 * `_helpers.ts` — лише parse/format/palette boilerplate.
 * Логіку evaluate пиши прямо тут у файлі примітиву.
 */
import type { FormulaPrimitiveDefinition } from "@/lib/formula/nodes/_definition";
import {
  aggregateCompletion,
  aggregatePaletteItem,
  evalAggregateArgValues,
  formatAggregateCode,
  formatAggregateLabel,
  parseAggregateCall,
} from "@/lib/formula/nodes/_helpers";

const KEYWORD = "SUM" as const;

export const templatePrimitive: FormulaPrimitiveDefinition = {
  id: "my-fn",
  astType: "aggregate",
  matchNode: (node) => node.type === "aggregate" && node.function === KEYWORD,
  call: { keyword: KEYWORD },
  evaluate: (node, context, evaluateChild) => {
    if (node.type !== "aggregate" || node.function !== KEYWORD) {
      return 0;
    }
    const values = evalAggregateArgValues(node, context, evaluateChild);
    // ← твоя логіка тут
    return values.reduce((total, value) => total + value, 0);
  },
  formatCode: (node, ctx) => formatAggregateCode(KEYWORD, node, ctx),
  formatLabel: (node, ctx) => formatAggregateLabel(KEYWORD, node, ctx),
  parseCodeCall: (keyword, ctx) => parseAggregateCall(keyword, KEYWORD, ctx),
  paletteItems: () => [aggregatePaletteItem(KEYWORD)],
  completions: () => [aggregateCompletion(KEYWORD, "Describe for autocomplete")],
};
