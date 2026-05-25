import type { AggregateFunction, BlockExpression } from "@/types/calculator";
import { emptyBlockExpression } from "@/types/calculator";

export const AGGREGATE_APPEND_SLOT = "arg-append";

function isArgFilled(expression: BlockExpression): boolean {
  if (expression.type === "group") {
    return isArgFilled(expression.inner);
  }
  if (expression.type === "aggregate") {
    return expression.args.some(isArgFilled);
  }
  return expression.type !== "empty";
}

export function normalizeAggregateArgs(args: BlockExpression[]): BlockExpression[] {
  const next = args.length > 0 ? [...args] : [emptyBlockExpression()];
  const last = next[next.length - 1];
  if (isArgFilled(last)) {
    next.push(emptyBlockExpression());
  }
  return next;
}

export function filledAggregateArgs(args: BlockExpression[]): BlockExpression[] {
  return args.filter(isArgFilled);
}

export function setAggregateArgAt(
  aggregate: Extract<BlockExpression, { type: "aggregate" }>,
  index: number,
  value: BlockExpression,
): BlockExpression {
  const args = normalizeAggregateArgs([...aggregate.args]);
  args[index] = value;
  return { ...aggregate, args: normalizeAggregateArgs(args) };
}

export function setAggregateAppendArg(
  aggregate: Extract<BlockExpression, { type: "aggregate" }>,
  value: BlockExpression,
): BlockExpression {
  const args = normalizeAggregateArgs([...aggregate.args]);
  const emptyIndex = args.findIndex((arg) => !isArgFilled(arg));
  if (emptyIndex >= 0) {
    args[emptyIndex] = value;
  } else {
    args.push(value);
  }
  return { ...aggregate, args: normalizeAggregateArgs(args) };
}

export function removeAggregateArgAt(
  aggregate: Extract<BlockExpression, { type: "aggregate" }>,
  index: number,
): BlockExpression {
  const args = aggregate.args.filter((_, i) => i !== index);
  if (args.length === 0) {
    return emptyBlockExpression();
  }
  return { ...aggregate, args: normalizeAggregateArgs(args) };
}

export function unwrapAggregate(
  aggregate: Extract<BlockExpression, { type: "aggregate" }>,
): BlockExpression {
  const filled = filledAggregateArgs(aggregate.args);
  if (filled.length === 1) {
    return filled[0];
  }
  if (filled.length === 0) {
    return emptyBlockExpression();
  }
  return { ...aggregate, args: filled };
}

export function aggregateFunctionLabel(fn: AggregateFunction): string {
  return fn;
}
