import type { FormulaPrimitiveDefinition } from "@/lib/formula/nodes/_definition";
import {
  formatBinaryCode,
  formatBinaryLabel,
  INFIX_PRECEDENCE,
  operatorPaletteItem,
} from "@/lib/formula/nodes/_helpers";

export const dividePrimitive: FormulaPrimitiveDefinition = {
  id: "divide",
  astType: "operation",
  matchNode: (node) => node.type === "operation" && node.operator === "/",
  infix: { symbol: "/", precedence: INFIX_PRECEDENCE["/"] },
  evaluate: (node, context, evaluateChild) => {
    if (node.type !== "operation" || node.operator !== "/") {
      return 0;
    }
    const left = evaluateChild(node.left, context);
    const right = evaluateChild(node.right, context);
    if (right === 0) {
      context.onWarning?.(
        "Ділення на нуль — перевірте кількість у полях або змініть формулу (прибуток не може ділитися на 0)",
      );
      return 0;
    }
    return left / right;
  },
  formatCode: (node, ctx) => {
    if (node.type !== "operation" || node.operator !== "/") {
      return "?";
    }
    return formatBinaryCode(node, ctx, "/");
  },
  formatLabel: (node, ctx) => {
    if (node.type !== "operation" || node.operator !== "/") {
      return "?";
    }
    return formatBinaryLabel(node, ctx, "/");
  },
  paletteItems: () => [operatorPaletteItem("/")],
};
