import type {
  BlockExpression,
  BlockOperand,
  FormulaOperator,
} from "@/types/calculator";
import { emptyBlockExpression } from "@/types/calculator";
import type { SlotPath } from "@/lib/formula/blocks/block-tree";

export type FlatToken =
  | { id: string; kind: "operand"; path: SlotPath[]; operand: BlockOperand }
  | { id: string; kind: "operator"; path: SlotPath[]; operator: FormulaOperator }
  | { id: string; kind: "empty"; path: SlotPath[] };

function slotTokenId(path: SlotPath[]): string {
  return `slot-${path.join("-") || "root"}`;
}

function operatorTokenId(path: SlotPath[]): string {
  return `op-${path.join("-") || "root"}`;
}

export function flattenExpression(
  expression: BlockExpression,
  path: SlotPath[] = [],
): FlatToken[] {
  if (expression.type === "aggregate" || expression.type === "rowAggregate") {
    return [];
  }
  if (expression.type === "conditional") {
    return [];
  }
  if (expression.type === "round") {
    return [];
  }

  if (expression.type === "group") {
    return flattenExpression(expression.inner, [...path, "inner"]);
  }

  if (expression.type === "empty") {
    return [{ id: slotTokenId(path), kind: "empty", path }];
  }

  if (expression.type === "operand") {
    return [
      {
        id: slotTokenId(path),
        kind: "operand",
        path,
        operand: expression.operand,
      },
    ];
  }

  return [
    ...flattenExpression(expression.left, [...path, "left"]),
    {
      id: operatorTokenId(path),
      kind: "operator",
      path,
      operator: expression.operator,
    },
    ...flattenExpression(expression.right, [...path, "right"]),
  ];
}

/** Left-associative chain: no operation on the right branch. */
export function isReorderableChain(expression: BlockExpression): boolean {
  if (expression.type === "aggregate") {
    return false;
  }
  if (expression.type === "rowAggregate") {
    return false;
  }
  if (expression.type === "conditional") {
    return false;
  }
  if (expression.type === "round") {
    return false;
  }
  if (expression.type === "empty" || expression.type === "operand") {
    return true;
  }
  if (expression.type === "group") {
    return isReorderableChain(expression.inner);
  }
  if (expression.right.type === "operation") {
    return false;
  }
  return isReorderableChain(expression.left);
}

export function tokensToExpression(tokens: FlatToken[]): BlockExpression {
  if (tokens.length === 0) {
    return emptyBlockExpression();
  }

  const first = tokens[0];
  if (first.kind === "empty") {
    return emptyBlockExpression();
  }

  if (first.kind !== "operand") {
    return emptyBlockExpression();
  }

  let acc: BlockExpression = { type: "operand", operand: first.operand };

  for (let i = 1; i < tokens.length; i += 2) {
    const opToken = tokens[i];
    const rhsToken = tokens[i + 1];
    if (!opToken || opToken.kind !== "operator" || !rhsToken) {
      break;
    }

    const right: BlockExpression =
      rhsToken.kind === "operand"
        ? { type: "operand", operand: rhsToken.operand }
        : emptyBlockExpression();

    acc = {
      type: "operation",
      operator: opToken.operator,
      left: acc,
      right,
    };
  }

  return acc;
}
