import { filledAggregateArgs } from "@/lib/formula/core/aggregate-helpers";
import { isLineItemsField, rowAggregateLabel } from "@/lib/calculator/fields/line-items";
import type { EvalContext } from "@/lib/formula/runtime/block-evaluate";
import type {
  ExpressionEvaluator,
  FormulaCodeFormatContext,
  FormulaDisplayContext,
  FormulaCodeParseContext,
  FormulaPaletteContext,
} from "@/lib/formula/nodes/_definition";
import { getInputById } from "@/lib/formula/core/operand-labels";
import type {
  AggregateFunction,
  BlockExpression,
  FormulaOperator,
} from "@/types/calculator";
import { emptyBlockExpression } from "@/types/calculator";

/** Shared precedence for infix operators — not business logic. */
export const INFIX_PRECEDENCE: Record<FormulaOperator, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
  ">": 0,
  "<": 0,
  ">=": 0,
  "<=": 0,
  "==": 0,
  "!=": 0,
};

export type ComparisonOperator = Extract<
  FormulaOperator,
  ">" | "<" | ">=" | "<=" | "==" | "!="
>;

const OP_LABELS: Record<FormulaOperator, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
  ">": ">",
  "<": "<",
  ">=": "≥",
  "<=": "≤",
  "==": "=",
  "!=": "≠",
};

export function formatBinaryCode(
  node: Extract<BlockExpression, { type: "operation" }>,
  ctx: FormulaCodeFormatContext,
  operator: FormulaOperator,
): string {
  const prec = INFIX_PRECEDENCE[operator];
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
    (INFIX_PRECEDENCE[node.right.operator] ?? 0) <= prec &&
    (operator === "-" ||
      operator === "/" ||
      (INFIX_PRECEDENCE[operator] ?? 0) === 0)
  ) {
    rightStr = `(${rightStr})`;
  }

  if (
    node.left.type === "operation" &&
    (INFIX_PRECEDENCE[node.left.operator] ?? 0) === 0 &&
    (INFIX_PRECEDENCE[operator] ?? 0) === 0 &&
    operator !== node.left.operator
  ) {
    leftStr = `(${leftStr})`;
  }

  return `${leftStr} ${operator} ${rightStr}`;
}

export function formatBinaryLabel(
  node: Extract<BlockExpression, { type: "operation" }>,
  ctx: FormulaDisplayContext,
  operator: FormulaOperator,
): string {
  const left = ctx.formatChild(node.left);
  const right = ctx.formatChild(node.right);
  const op = OP_LABELS[operator];
  const needsParens =
    node.left.type === "operation" ||
    node.right.type === "operation" ||
    node.left.type === "group" ||
    node.right.type === "group";
  if (needsParens) {
    return `(${left} ${op} ${right})`;
  }
  return `${left} ${op} ${right}`;
}

export function operatorPaletteItem(
  operator: FormulaOperator,
  label?: string,
) {
  const paletteLabel = label ?? OP_LABELS[operator];
  return {
    id: `op-${operator}`,
    label: paletteLabel,
    category: "operator" as const,
    color: "operator" as const,
    dragData: { kind: "operator" as const, operator },
  };
}

export function evalComparisonOperands(
  left: number,
  operator: ComparisonOperator,
  right: number,
): number {
  switch (operator) {
    case ">":
      return left > right ? 1 : 0;
    case "<":
      return left < right ? 1 : 0;
    case ">=":
      return left >= right ? 1 : 0;
    case "<=":
      return left <= right ? 1 : 0;
    case "==":
      return left === right ? 1 : 0;
    case "!=":
      return left !== right ? 1 : 0;
  }
}

export function createComparisonPrimitive(
  id: string,
  symbol: ComparisonOperator,
): import("@/lib/formula/nodes/_definition").FormulaPrimitiveDefinition {
  return {
    id,
    astType: "operation",
    matchNode: (node) => node.type === "operation" && node.operator === symbol,
    infix: { symbol, precedence: INFIX_PRECEDENCE[symbol] },
    evaluate: (node, context, evaluateChild) => {
      if (node.type !== "operation" || node.operator !== symbol) {
        return 0;
      }
      return evalComparisonOperands(
        evaluateChild(node.left, context),
        symbol,
        evaluateChild(node.right, context),
      );
    },
    formatCode: (node, ctx) => {
      if (node.type !== "operation" || node.operator !== symbol) {
        return "?";
      }
      return formatBinaryCode(node, ctx, symbol);
    },
    formatLabel: (node, ctx) => {
      if (node.type !== "operation" || node.operator !== symbol) {
        return "?";
      }
      return formatBinaryLabel(node, ctx, symbol);
    },
    paletteItems: () => [operatorPaletteItem(symbol)],
  };
}

/** Collect evaluated numeric args — caller applies SUM/AVG/… logic. */
export function evalAggregateArgValues(
  node: Extract<BlockExpression, { type: "aggregate" }>,
  context: EvalContext,
  evaluateChild: ExpressionEvaluator,
): number[] {
  return filledAggregateArgs(node.args).map((arg) =>
    evaluateChild(arg, context),
  );
}

export function formatAggregateCode(
  keyword: string,
  node: BlockExpression,
  ctx: FormulaCodeFormatContext,
): string {
  if (node.type !== "aggregate") {
    return "?";
  }
  const args = filledAggregateArgs(node.args)
    .map((arg) => ctx.formatChild(arg, { rowFieldId: ctx.rowFieldId }))
    .join(", ");
  return `${keyword}(${args})`;
}

export function formatAggregateLabel(
  keyword: string,
  node: BlockExpression,
  ctx: FormulaDisplayContext,
): string {
  if (node.type !== "aggregate") {
    return "?";
  }
  const parts = filledAggregateArgs(node.args).map((arg) => ctx.formatChild(arg));
  const inner = parts.length > 0 ? parts.join(", ") : "…";
  return `${keyword}(${inner})`;
}

export function parseAggregateCall(
  keyword: string,
  fn: AggregateFunction,
  ctx: FormulaCodeParseContext,
): BlockExpression | null {
  if (keyword !== fn) {
    return null;
  }
  if (!ctx.peekIsLParen()) {
    ctx.fail(`Expected "(" after ${fn}`, ctx.identEnd);
  }
  ctx.expectLParen();
  const args = ctx.parseArgumentList();
  ctx.expectRParen();
  return {
    type: "aggregate",
    function: fn,
    args: args.length > 0 ? args : [emptyBlockExpression()],
  };
}

export function aggregatePaletteItem(fn: AggregateFunction) {
  return {
    id: `agg-${fn}`,
    label: fn,
    category: "aggregate" as const,
    color: "aggregate" as const,
    meta: { title: fn, hint: `${fn}( … )` },
    dragData: { kind: "aggregate" as const, function: fn },
  };
}

/** Collect per-row values — caller applies SUM/AVG/… logic. */
export function evalRowInnerValues(
  node: Extract<BlockExpression, { type: "rowAggregate" }>,
  context: EvalContext,
  evaluateChild: ExpressionEvaluator,
): number[] {
  const field = context.inputs.find((input) => input.id === node.fieldId);
  if (!field || !isLineItemsField(field)) {
    return [];
  }
  const rows = context.lineItemRows[node.fieldId] ?? [];
  return rows.map((row) =>
    evaluateChild(node.inner, { ...context, currentLineRow: row }),
  );
}

export function formatRowAggregateCode(
  keyword: string,
  node: BlockExpression,
  ctx: FormulaCodeFormatContext,
): string {
  if (node.type !== "rowAggregate") {
    return "?";
  }
  const inner = ctx.formatChild(node.inner, { rowFieldId: node.fieldId });
  return `${keyword}(${node.fieldId}, ${inner})`;
}

export function formatRowAggregateLabel(
  fn: AggregateFunction,
  node: BlockExpression,
  ctx: FormulaDisplayContext,
): string {
  if (node.type !== "rowAggregate") {
    return "?";
  }
  const input = getInputById(ctx.config, node.fieldId);
  const table = input?.label.trim() || "…";
  const inner = ctx.formatChild(node.inner);
  return `${fn} rows(${table}: ${inner})`;
}

export function parseRowAggregateCall(
  ident: string,
  fn: AggregateFunction,
  ctx: FormulaCodeParseContext,
): BlockExpression | null {
  const keyword = `${fn}_ROWS`;
  if (ident !== keyword) {
    return null;
  }
  if (!ctx.peekIsLParen()) {
    return null;
  }
  ctx.expectLParen();
  const fieldToken = ctx.expectIdent();
  ctx.expectComma();
  const inner = ctx.parseExpressionWithRowField(fieldToken.value);
  ctx.expectRParen();
  return {
    type: "rowAggregate",
    fieldId: fieldToken.value,
    function: fn,
    inner,
  };
}

export function rowAggregatePaletteItems(
  fn: AggregateFunction,
  ctx: FormulaPaletteContext,
) {
  const blocks = [];
  for (const input of ctx.config.inputs) {
    if (!isLineItemsField(input)) {
      continue;
    }
    const label = input.label.trim() || "…";
    blocks.push({
      id: `rows-${fn}-${input.id}`,
      label: rowAggregateLabel(fn, label, ctx.rowsLabel),
      category: "rowAggregate" as const,
      color: "rowAggregate" as const,
      meta: {
        groupId: input.id,
        groupLabel: label,
        title: `${fn} ${ctx.rowsLabel}`,
        hint: label,
      },
      dragData: { kind: "rowAggregate" as const, fieldId: input.id, function: fn },
    });
  }
  return blocks;
}

const CONDITIONAL_BRANCHES = ["condition", "whenTrue", "whenFalse"] as const;

export function formatConditionalCode(
  node: BlockExpression,
  ctx: FormulaCodeFormatContext,
): string {
  if (node.type !== "conditional") {
    return "?";
  }
  const parts = CONDITIONAL_BRANCHES.map((branch) =>
    ctx.formatChild(node[branch], { rowFieldId: ctx.rowFieldId }),
  );
  return `IF(${parts.join(", ")})`;
}

export function formatConditionalLabel(
  node: BlockExpression,
  ctx: FormulaDisplayContext,
): string {
  if (node.type !== "conditional") {
    return "?";
  }
  const parts = CONDITIONAL_BRANCHES.map((branch) => ctx.formatChild(node[branch]));
  return `IF(${parts.join(", ")})`;
}

export function parseConditionalCall(
  keyword: string,
  ctx: FormulaCodeParseContext,
): BlockExpression | null {
  if (keyword !== "IF") {
    return null;
  }
  if (!ctx.peekIsLParen()) {
    ctx.fail('Expected "(" after IF', ctx.identEnd);
  }
  ctx.expectLParen();
  const args = ctx.parseArgumentList();
  ctx.expectRParen();
  if (args.length !== 3) {
    ctx.fail("IF requires exactly 3 arguments: condition, then, else", ctx.identEnd);
  }
  return {
    type: "conditional",
    condition: args[0]!,
    whenTrue: args[1]!,
    whenFalse: args[2]!,
  };
}

export function conditionalPaletteItem() {
  return {
    id: "if",
    label: "IF",
    category: "conditional" as const,
    color: "conditional" as const,
    meta: { title: "IF", hint: "IF(condition, then, else)" },
    dragData: { kind: "conditional" as const },
  };
}

function roundDecimalsOperand(
  node: BlockExpression,
): BlockExpression {
  if (node.type !== "round") {
    return { type: "operand", operand: { kind: "number", value: 0 } };
  }
  return node.decimals;
}

function literalDecimalPlaces(decimals: BlockExpression): number | null {
  if (
    decimals.type === "operand" &&
    decimals.operand.kind === "number" &&
    Number.isFinite(decimals.operand.value)
  ) {
    return Math.max(0, Math.min(10, Math.round(decimals.operand.value)));
  }
  return null;
}

export function formatRoundCode(
  node: BlockExpression,
  ctx: FormulaCodeFormatContext,
): string {
  if (node.type !== "round") {
    return "?";
  }
  const value = ctx.formatChild(node.value, { rowFieldId: ctx.rowFieldId });
  const places = literalDecimalPlaces(node.decimals);
  if (places == null || places === 0) {
    const decimalsText = ctx.formatChild(node.decimals, { rowFieldId: ctx.rowFieldId });
    if (decimalsText === "0") {
      return `ROUND(${value})`;
    }
    return `ROUND(${value}, ${decimalsText})`;
  }
  if (places === 0) {
    return `ROUND(${value})`;
  }
  return `ROUND(${value}, ${places})`;
}

export function formatRoundLabel(
  node: BlockExpression,
  ctx: FormulaDisplayContext,
): string {
  if (node.type !== "round") {
    return "?";
  }
  const value = ctx.formatChild(node.value);
  if (
    node.decimals.type === "operand" &&
    node.decimals.operand.kind === "number" &&
    node.decimals.operand.value === 0
  ) {
    return `ROUND(${value})`;
  }
  const decimals = ctx.formatChild(node.decimals);
  return `ROUND(${value}, ${decimals})`;
}

export function parseRoundCall(
  keyword: string,
  ctx: FormulaCodeParseContext,
): BlockExpression | null {
  if (keyword !== "ROUND") {
    return null;
  }
  if (!ctx.peekIsLParen()) {
    ctx.fail('Expected "(" after ROUND', ctx.identEnd);
  }
  ctx.expectLParen();
  const args = ctx.parseArgumentList();
  ctx.expectRParen();
  if (args.length < 1 || args.length > 2) {
    ctx.fail("ROUND requires 1 or 2 arguments: value, [decimals]", ctx.identEnd);
  }
  return {
    type: "round",
    value: args[0]!,
    decimals:
      args[1] ??
      ({
        type: "operand",
        operand: { kind: "number", value: 0 },
      } satisfies BlockExpression),
  };
}

export function roundPaletteItem() {
  return {
    id: "round",
    label: "ROUND",
    category: "round" as const,
    color: "round" as const,
    meta: { title: "ROUND", hint: "ROUND(value, decimals?)" },
    dragData: { kind: "round" as const },
  };
}
