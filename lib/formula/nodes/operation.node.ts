import type { FormulaOperator } from "@/types/calculator";
import type { FormulaNodeDefinition } from "@/lib/formula/nodes/_definition";

const PREC: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
};

const OP_LABELS: Record<FormulaOperator, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

const OPERATORS: FormulaOperator[] = ["+", "-", "*", "/"];

export const operationNode: FormulaNodeDefinition<"operation"> = {
  type: "operation",
  evaluate: (node, context, evaluateChild) => {
    const left = evaluateChild(node.left, context);
    const right = evaluateChild(node.right, context);

    switch (node.operator) {
      case "+":
        return left + right;
      case "-":
        return left - right;
      case "*":
        return left * right;
      case "/":
        if (right === 0) {
          context.onWarning?.(
            "Ділення на нуль — перевірте кількість у полях або змініть формулу (прибуток не може ділитися на 0)",
          );
          return 0;
        }
        return left / right;
      default:
        throw new Error("Invalid operator");
    }
  },
  formatCode: (node, ctx) => {
    const prec = PREC[node.operator] ?? 0;
    const parentPrec = 0;
    let leftStr = ctx.formatChild(node.left, {
      rowFieldId: ctx.rowFieldId,
      parentPrec: prec,
    });
    let rightStr = ctx.formatChild(node.right, {
      rowFieldId: ctx.rowFieldId,
      parentPrec: prec,
      isRightOperand: true,
    });

    if (
      node.right.type === "operation" &&
      (PREC[node.right.operator] ?? 0) <= prec &&
      (node.operator === "-" || node.operator === "/")
    ) {
      rightStr = `(${rightStr})`;
    }

    const text = `${leftStr} ${node.operator} ${rightStr}`;
    if (prec < parentPrec) {
      return `(${text})`;
    }
    return text;
  },
  formatLabel: (node, ctx) => {
    const left = ctx.formatChild(node.left);
    const right = ctx.formatChild(node.right);
    const op = OP_LABELS[node.operator] ?? node.operator;
    const needsParens =
      node.left.type === "operation" ||
      node.right.type === "operation" ||
      node.left.type === "group" ||
      node.right.type === "group";
    if (needsParens) {
      return `(${left} ${op} ${right})`;
    }
    return `${left} ${op} ${right}`;
  },
  paletteItems: () =>
    OPERATORS.map((operator) => ({
      id: `op-${operator}`,
      label: operator === "*" ? "×" : operator === "/" ? "÷" : operator,
      category: "operator" as const,
      color: "operator" as const,
      dragData: { kind: "operator" as const, operator },
    })),
};
