import { filledAggregateArgs } from "@/lib/formula/core/aggregate-helpers";
import type { FormulaCompletionItem } from "@/lib/formula/code/formula-code-completions";
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
};

const OP_LABELS: Record<FormulaOperator, string> = {
  "+": "+",
  "-": "−",
  "*": "×",
  "/": "÷",
};

export function formatBinaryCode(
  node: Extract<BlockExpression, { type: "operation" }>,
  ctx: FormulaCodeFormatContext,
  operator: FormulaOperator,
): string {
  const prec = INFIX_PRECEDENCE[operator];
  const leftStr = ctx.formatChild(node.left, {
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
    (operator === "-" || operator === "/")
  ) {
    rightStr = `(${rightStr})`;
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
  const paletteLabel =
    label ?? (operator === "*" ? "×" : operator === "/" ? "÷" : operator);
  return {
    id: `op-${operator}`,
    label: paletteLabel,
    category: "operator" as const,
    color: "operator" as const,
    dragData: { kind: "operator" as const, operator },
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

export function aggregateCompletion(
  fn: AggregateFunction,
  detail?: string,
): FormulaCompletionItem {
  return {
    label: fn,
    type: "keyword",
    insertText: `${fn}($0)`,
    detail,
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

export function rowAggregateCompletion(fn: AggregateFunction): FormulaCompletionItem {
  const keyword = `${fn}_ROWS`;
  return {
    label: keyword,
    type: "keyword",
    insertText: `${keyword}(field_id, row.qty * row.var_cost)`,
    detail: "Line items aggregate",
  };
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

export function conditionalCompletion(): FormulaCompletionItem {
  return {
    label: "IF",
    type: "keyword",
    insertText: "IF($0, , )",
    detail: "Conditional: non-zero condition picks then-branch, else else-branch",
  };
}
