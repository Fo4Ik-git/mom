import type { FormulaPrimitiveDefinition } from "@/lib/formula/nodes/_definition";
import {
  formatBinaryCode,
  formatBinaryLabel,
  INFIX_PRECEDENCE,
  operatorPaletteItem,
} from "@/lib/formula/nodes/_helpers";

export const multiplyPrimitive: FormulaPrimitiveDefinition = {
  id: "multiply",
  astType: "operation",
  matchNode: (node) => node.type === "operation" && node.operator === "*",
  infix: { symbol: "*", precedence: INFIX_PRECEDENCE["*"] },
  evaluate: (node, context, evaluateChild) => {
    if (node.type !== "operation" || node.operator !== "*") {
      return 0;
    }
    return evaluateChild(node.left, context) * evaluateChild(node.right, context);
  },
  formatCode: (node, ctx) => {
    if (node.type !== "operation" || node.operator !== "*") {
      return "?";
    }
    return formatBinaryCode(node, ctx, "*");
  },
  formatLabel: (node, ctx) => {
    if (node.type !== "operation" || node.operator !== "*") {
      return "?";
    }
    return formatBinaryLabel(node, ctx, "*");
  },
  paletteItems: () => [operatorPaletteItem("*")],
};
