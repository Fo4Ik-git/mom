import type {
  AggregateFunction,
  BlockExpression,
  BlockOperand,
  FormulaOperator,
} from "@/types/calculator";
import {
  emptyAggregateExpression,
  emptyBlockExpression,
  emptyRowAggregateExpression,
  isArgPathSegment,
} from "@/types/calculator";
import {
  AGGREGATE_APPEND_SLOT,
  normalizeAggregateArgs,
  setAggregateAppendArg,
  setAggregateArgAt,
  unwrapAggregate,
} from "@/lib/formula/core/aggregate-helpers";

export type SlotPath =
  | "left"
  | "right"
  | "inner"
  | "continue"
  | typeof AGGREGATE_APPEND_SLOT
  | `${number}`;

export const CONTINUE_PATH: SlotPath[] = ["continue"];

export function isContinuePath(path: SlotPath[]): boolean {
  return path.length >= 1 && path[path.length - 1] === "continue";
}

export function continueAnchorPath(path: SlotPath[]): SlotPath[] {
  return path.slice(0, -1);
}

/** Show + slot after the left operand when the right side is still empty. */
export function showContinuationAfterLeft(
  expression: BlockExpression,
): boolean {
  return (
    expression.type === "operation" &&
    isExpressionFilled(expression.left) &&
    !isExpressionFilled(expression.right)
  );
}

/** Show + slot inside ( ) after a complete inner subtree (not mid-operation). */
export function showContinuationInsideGroup(
  inner: BlockExpression,
): boolean {
  if (!isExpressionFilled(inner)) {
    return false;
  }
  if (inner.type === "operation") {
    return (
      isExpressionFilled(inner.left) && isExpressionFilled(inner.right)
    );
  }
  return true;
}

/** Show an extra empty slot to append more formula after this subtree. */
export function showContinuationAfter(expression: BlockExpression): boolean {
  if (expression.type === "empty") {
    return false;
  }
  if (expression.type === "operand") {
    return true;
  }
  if (expression.type === "group") {
    return isExpressionFilled(expression.inner);
  }
  if (expression.type === "operation") {
    return (
      isExpressionFilled(expression.left) && isExpressionFilled(expression.right)
    );
  }
  return false;
}

export function applyAfterExpression(
  root: BlockExpression,
  item: PaletteDragData,
): BlockExpression {
  if (!isExpressionFilled(root)) {
    return applyPaletteToSlot(root, [], item);
  }

  if (item.source === "palette" && item.kind === "operator") {
    return {
      type: "operation",
      operator: item.operator,
      left: root,
      right: emptyBlockExpression(),
    };
  }

  if (item.source === "palette" && item.kind === "group") {
    return {
      type: "operation",
      operator: "+",
      left: root,
      right: { type: "group", inner: emptyBlockExpression() },
    };
  }

  if (item.source === "palette" && item.kind === "operand") {
    return {
      type: "operation",
      operator: "+",
      left: root,
      right: { type: "operand", operand: item.operand },
    };
  }

  if (item.source === "palette" && item.kind === "number") {
    return {
      type: "operation",
      operator: "+",
      left: root,
      right: { type: "operand", operand: { kind: "number", value: item.value } },
    };
  }

  if (item.source === "palette" && item.kind === "expression") {
    return {
      type: "operation",
      operator: "+",
      left: root,
      right: item.expression,
    };
  }

  return root;
}

export function applyContinueAtPath(
  root: BlockExpression,
  path: SlotPath[],
  item: PaletteDragData,
): BlockExpression {
  const anchorPath = continueAnchorPath(path);

  if (anchorPath.length === 0) {
    return applyAfterExpression(root, item);
  }

  const anchor = getSlotExpression(root, anchorPath);
  const parentPath = anchorPath.slice(0, -1);
  const slot = anchorPath[anchorPath.length - 1];
  const parent =
    parentPath.length === 0 ? root : getSlotExpression(root, parentPath);

  if (parent.type === "operation" && slot === "left") {
    if (item.source === "palette" && item.kind === "operator") {
      return setSlotExpression(root, parentPath, {
        type: "operation",
        operator: item.operator,
        left: anchor,
        right: parent.right,
      });
    }
    if (item.source === "palette" && item.kind === "operand") {
      return setSlotExpression(root, parentPath, {
        type: "operation",
        operator: "+",
        left: anchor,
        right: { type: "operand", operand: item.operand },
      });
    }
    if (item.source === "palette" && item.kind === "number") {
      return setSlotExpression(root, parentPath, {
        type: "operation",
        operator: "+",
        left: anchor,
        right: {
          type: "operand",
          operand: { kind: "number", value: item.value },
        },
      });
    }
    if (item.source === "palette" && item.kind === "group") {
      return setSlotExpression(root, parentPath, {
        type: "operation",
        operator: "+",
        left: anchor,
        right: { type: "group", inner: emptyBlockExpression() },
      });
    }
  }

  if (parent.type === "group" && slot === "inner") {
    return setSlotExpression(root, parentPath, {
      ...parent,
      inner: applyAfterExpression(anchor, item),
    });
  }

  return setSlotExpression(
    root,
    anchorPath,
    applyAfterExpression(anchor, item),
  );
}

export function pathsEqual(a: SlotPath[], b: SlotPath[]): boolean {
  return a.length === b.length && a.every((s, i) => s === b[i]);
}

export function isAncestorPath(
  ancestor: SlotPath[],
  descendant: SlotPath[],
): boolean {
  if (ancestor.length >= descendant.length) {
    return false;
  }
  return ancestor.every((s, i) => descendant[i] === s);
}

export type PaletteDragData =
  | { source: "palette"; kind: "operand"; operand: BlockOperand }
  | { source: "palette"; kind: "operator"; operator: FormulaOperator }
  | { source: "palette"; kind: "number"; value: number }
  | { source: "palette"; kind: "group" }
  | { source: "palette"; kind: "aggregate"; function: AggregateFunction }
  | {
      source: "palette";
      kind: "rowAggregate";
      fieldId: string;
      function: AggregateFunction;
    }
  | { source: "palette"; kind: "expression"; expression: BlockExpression };

export function isExpressionFilled(expression: BlockExpression): boolean {
  if (expression.type === "group") {
    return isExpressionFilled(expression.inner);
  }
  if (expression.type === "aggregate") {
    return expression.args.some(isExpressionFilled);
  }
  if (expression.type === "rowAggregate") {
    return isExpressionFilled(expression.inner);
  }
  return expression.type !== "empty";
}

export function getSlotExpression(
  root: BlockExpression,
  path: SlotPath[],
): BlockExpression {
  let current = root;
  for (const slot of path) {
    if (current.type === "group") {
      if (slot !== "inner") {
        return emptyBlockExpression();
      }
      current = current.inner;
      continue;
    }
    if (current.type === "aggregate") {
      if (slot === AGGREGATE_APPEND_SLOT) {
        return emptyBlockExpression();
      }
      if (isArgPathSegment(slot)) {
        const index = Number(slot);
        current = current.args[index] ?? emptyBlockExpression();
        continue;
      }
      return emptyBlockExpression();
    }
    if (current.type === "rowAggregate") {
      if (slot !== "inner") {
        return emptyBlockExpression();
      }
      current = current.inner;
      continue;
    }
    if (current.type !== "operation") {
      return emptyBlockExpression();
    }
    current = slot === "left" ? current.left : current.right;
  }
  return current;
}

export function setSlotExpression(
  root: BlockExpression,
  path: SlotPath[],
  value: BlockExpression,
): BlockExpression {
  if (path.length === 0) {
    return value;
  }

  if (root.type === "group") {
    if (path[0] !== "inner") {
      return root;
    }
    return {
      ...root,
      inner: setSlotExpression(root.inner, path.slice(1), value),
    };
  }

  if (root.type === "aggregate") {
    const [slot, ...rest] = path;
    if (slot === AGGREGATE_APPEND_SLOT && rest.length === 0) {
      return setAggregateAppendArg(root, value);
    }
    if (isArgPathSegment(slot) && rest.length === 0) {
      return setAggregateArgAt(root, Number(slot), value);
    }
    if (isArgPathSegment(slot)) {
      const index = Number(slot);
      const arg = root.args[index] ?? emptyBlockExpression();
      const updatedArg = setSlotExpression(arg, rest, value);
      return {
        ...root,
        args: normalizeAggregateArgs(
          root.args.map((item, i) => (i === index ? updatedArg : item)),
        ),
      };
    }
    return root;
  }

  if (root.type === "rowAggregate") {
    if (path[0] !== "inner") {
      return root;
    }
    return {
      ...root,
      inner: setSlotExpression(root.inner, path.slice(1), value),
    };
  }

  if (root.type !== "operation") {
    const operation: BlockExpression = {
      type: "operation",
      operator: "*",
      left: root.type === "empty" ? emptyBlockExpression() : root,
      right: emptyBlockExpression(),
    };
    return setSlotExpression(operation, path, value);
  }

  const [slot, ...rest] = path;
  const next =
    slot === "left"
      ? setSlotExpression(root.left, rest, value)
      : setSlotExpression(root.right, rest, value);

  return {
    ...root,
    [slot]: next,
  };
}

export function applyPaletteToSlot(
  root: BlockExpression,
  path: SlotPath[],
  item: PaletteDragData,
): BlockExpression {
  if (isContinuePath(path)) {
    return applyContinueAtPath(root, path, item);
  }

  const current = getSlotExpression(root, path);

  if (item.source === "palette" && item.kind === "group") {
    const inner =
      current.type === "empty" ? emptyBlockExpression() : current;
    return setSlotExpression(root, path, { type: "group", inner });
  }

  if (item.source === "palette" && item.kind === "aggregate") {
    return setSlotExpression(root, path, emptyAggregateExpression(item.function));
  }

  if (item.source === "palette" && item.kind === "rowAggregate") {
    return setSlotExpression(
      root,
      path,
      emptyRowAggregateExpression(item.fieldId, item.function),
    );
  }

  if (item.source === "palette" && item.kind === "operator") {
    if (current.type === "empty") {
      return setSlotExpression(root, path, {
        type: "operation",
        operator: item.operator,
        left: emptyBlockExpression(),
        right: emptyBlockExpression(),
      });
    }

  if (
      (current.type === "group" || current.type === "operand") &&
      path.length > 0
    ) {
      const parentPath = path.slice(0, -1);
      const childSlot = path[path.length - 1];
      const parent =
        parentPath.length === 0 ? root : getSlotExpression(root, parentPath);

      if (
        childSlot === "left" &&
        parent.type === "operation" &&
        !isExpressionFilled(parent.right)
      ) {
        return setSlotExpression(root, parentPath, {
          type: "operation",
          operator: item.operator,
          left: current,
          right: emptyBlockExpression(),
        });
      }
    }

    return setSlotExpression(root, path, {
      type: "operation",
      operator: item.operator,
      left: current,
      right: emptyBlockExpression(),
    });
  }

  if (item.source === "palette" && item.kind === "operand") {
    return setSlotExpression(root, path, {
      type: "operand",
      operand: item.operand,
    });
  }

  if (item.source === "palette" && item.kind === "number") {
    return setSlotExpression(root, path, {
      type: "operand",
      operand: { kind: "number", value: item.value },
    });
  }

  if (item.source === "palette" && item.kind === "expression") {
    return setSlotExpression(root, path, item.expression);
  }

  return root;
}

export function clearSlot(
  root: BlockExpression,
  path: SlotPath[],
): BlockExpression {
  return setSlotExpression(root, path, emptyBlockExpression());
}

export function removeGroupAt(
  root: BlockExpression,
  groupPath: SlotPath[],
): BlockExpression {
  const node =
    groupPath.length === 0 ? root : getSlotExpression(root, groupPath);

  if (node.type !== "group") {
    return root;
  }

  const replacement = node.inner;

  if (groupPath.length === 0) {
    return replacement;
  }

  return setSlotExpression(root, groupPath, replacement);
}

export function removeAggregateAt(
  root: BlockExpression,
  aggregatePath: SlotPath[],
): BlockExpression {
  const node =
    aggregatePath.length === 0
      ? root
      : getSlotExpression(root, aggregatePath);

  if (node.type !== "aggregate") {
    return root;
  }

  const replacement = unwrapAggregate(node);

  if (aggregatePath.length === 0) {
    return replacement;
  }

  return setSlotExpression(root, aggregatePath, replacement);
}

export function removeRowAggregateAt(
  root: BlockExpression,
  aggregatePath: SlotPath[],
): BlockExpression {
  const node =
    aggregatePath.length === 0
      ? root
      : getSlotExpression(root, aggregatePath);

  if (node.type !== "rowAggregate") {
    return root;
  }

  const replacement = isExpressionFilled(node.inner) ? node.inner : emptyBlockExpression();

  if (aggregatePath.length === 0) {
    return replacement;
  }

  return setSlotExpression(root, aggregatePath, replacement);
}

/** Remove an operation node; keeps a filled child if any, otherwise empty. */
export function removeOperationAt(
  root: BlockExpression,
  opPath: SlotPath[],
): BlockExpression {
  const node = opPath.length === 0 ? root : getSlotExpression(root, opPath);

  if (node.type !== "operation") {
    return clearSlot(root, opPath);
  }

  const replacement: BlockExpression = isExpressionFilled(node.left)
    ? node.left
    : isExpressionFilled(node.right)
      ? node.right
      : emptyBlockExpression();

  if (opPath.length === 0) {
    return replacement;
  }

  return setSlotExpression(root, opPath, replacement);
}

export function swapSlots(
  root: BlockExpression,
  pathA: SlotPath[],
  pathB: SlotPath[],
): BlockExpression {
  if (pathsEqual(pathA, pathB)) {
    return root;
  }
  if (isAncestorPath(pathA, pathB) || isAncestorPath(pathB, pathA)) {
    return root;
  }

  const exprA = getSlotExpression(root, pathA);
  const exprB = getSlotExpression(root, pathB);

  return setSlotExpression(
    setSlotExpression(root, pathA, exprB),
    pathB,
    exprA,
  );
}

export function moveSlotContent(
  root: BlockExpression,
  fromPath: SlotPath[],
  toPath: SlotPath[],
): BlockExpression {
  if (pathsEqual(fromPath, toPath)) {
    return root;
  }
  if (isAncestorPath(fromPath, toPath) || isAncestorPath(toPath, fromPath)) {
    return root;
  }

  const fromExpr = getSlotExpression(root, fromPath);
  if (!isExpressionFilled(fromExpr)) {
    return root;
  }

  const toExpr = getSlotExpression(root, toPath);
  if (!isExpressionFilled(toExpr)) {
    return setSlotExpression(
      setSlotExpression(root, fromPath, emptyBlockExpression()),
      toPath,
      fromExpr,
    );
  }

  return swapSlots(root, fromPath, toPath);
}

export function swapOperators(
  root: BlockExpression,
  pathA: SlotPath[],
  pathB: SlotPath[],
): BlockExpression {
  if (pathsEqual(pathA, pathB)) {
    return root;
  }

  const nodeA = pathA.length === 0 ? root : getSlotExpression(root, pathA);
  const nodeB = pathB.length === 0 ? root : getSlotExpression(root, pathB);

  if (nodeA.type !== "operation" || nodeB.type !== "operation") {
    return root;
  }

  const updatedA: BlockExpression = { ...nodeA, operator: nodeB.operator };
  const updatedB: BlockExpression = { ...nodeB, operator: nodeA.operator };

  let result =
    pathA.length === 0 ? updatedA : setSlotExpression(root, pathA, updatedA);
  result =
    pathB.length === 0 ? updatedB : setSlotExpression(result, pathB, updatedB);
  return result;
}

export type WorkspaceDragData =
  | { source: "workspace"; kind: "slot"; path: SlotPath[] }
  | { source: "workspace"; kind: "group"; path: SlotPath[] }
  | { source: "workspace"; kind: "aggregate"; path: SlotPath[]; function: AggregateFunction }
  | {
      source: "workspace";
      kind: "operator";
      path: SlotPath[];
      operator: FormulaOperator;
    };

/** Move any filled expression (operand, group, operation subtree) between slots. */
export function moveExpressionToSlot(
  root: BlockExpression,
  fromPath: SlotPath[],
  toPath: SlotPath[],
): BlockExpression {
  return moveSlotContent(root, fromPath, toPath);
}
