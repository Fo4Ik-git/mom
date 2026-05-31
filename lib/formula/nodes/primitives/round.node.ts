import type { BlockExpression } from "@/types/calculator";
import type {
  ExpressionEvaluator,
  FormulaPrimitiveDefinition,
} from "@/lib/formula/nodes/_definition";
import type { EvalContext } from "@/lib/formula/runtime/block-evaluate";
import {
  formatRoundCode,
  formatRoundLabel,
  parseRoundCall,
  roundPaletteItem,
} from "@/lib/formula/nodes/_helpers";

function decimalPlaces(
  node: BlockExpression,
  evaluateChild: ExpressionEvaluator,
  context: EvalContext,
): number {
  if (node.type !== "round") {
    return 0;
  }
  const raw = evaluateChild(node.decimals, context);
  if (!Number.isFinite(raw)) {
    return 0;
  }
  return Math.max(0, Math.min(10, Math.round(raw)));
}

export const roundPrimitive: FormulaPrimitiveDefinition = {
  id: "round",
  astType: "round",
  matchNode: (node) => node.type === "round",
  call: { keyword: "ROUND" },
  evaluate: (node, context, evaluateChild) => {
    if (node.type !== "round") {
      return 0;
    }
    const value = evaluateChild(node.value, context);
    if (!Number.isFinite(value)) {
      return 0;
    }
    const places = decimalPlaces(node, evaluateChild, context);
    const factor = 10 ** places;
    return Math.round(value * factor) / factor;
  },
  formatCode: (node, ctx) => formatRoundCode(node, ctx),
  formatLabel: (node, ctx) => formatRoundLabel(node, ctx),
  parseCodeCall: (keyword, ctx) => parseRoundCall(keyword, ctx),
  paletteItems: () => [roundPaletteItem()],
  doc: {
    example: "ROUND(field_item.var_price * field_item.qty, 2)",
  },
};
