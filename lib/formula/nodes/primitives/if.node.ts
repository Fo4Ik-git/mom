import type { FormulaPrimitiveDefinition } from "@/lib/formula/nodes/_definition";
import {
  conditionalPaletteItem,
  formatConditionalCode,
  formatConditionalLabel,
  parseConditionalCall,
} from "@/lib/formula/nodes/_helpers";

const KEYWORD = "IF" as const;

export const ifPrimitive: FormulaPrimitiveDefinition = {
  id: "if",
  astType: "conditional",
  matchNode: (node) => node.type === "conditional",
  call: { keyword: KEYWORD },
  evaluate: (node, context, evaluateChild) => {
    if (node.type !== "conditional") {
      return 0;
    }
    const condition = evaluateChild(node.condition, context);
    return condition !== 0
      ? evaluateChild(node.whenTrue, context)
      : evaluateChild(node.whenFalse, context);
  },
  formatCode: (node, ctx) => formatConditionalCode(node, ctx),
  formatLabel: (node, ctx) => formatConditionalLabel(node, ctx),
  parseCodeCall: (keyword, ctx) => parseConditionalCall(keyword, ctx),
  paletteItems: () => [conditionalPaletteItem()],
  doc: {
    example: "IF(field_item.qty > 10, field_item.var_price, 0)",
  },
};
