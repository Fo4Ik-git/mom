import { isLineItemsField, rowAggregateLabel } from "@/lib/calculator/line-items";
import { AGGREGATE_FUNCTIONS } from "@/types/calculator";
import type { AggregateFunction } from "@/types/calculator";
import type { FormulaNodeDefinition } from "@/lib/formula/nodes/_definition";
import type { FormulaCompletionItem } from "@/lib/formula/formula-code-completions";
import { applyAggregateFunction } from "@/lib/formula/nodes/_shared";
import { getInputById } from "@/lib/formula/operand-labels";

export const rowAggregateNode: FormulaNodeDefinition<"rowAggregate"> = {
  type: "rowAggregate",
  evaluate: (node, context, evaluateChild) => {
    const field = context.inputs.find((input) => input.id === node.fieldId);
    if (!field || !isLineItemsField(field)) {
      return 0;
    }

    const rows = context.lineItemRows[node.fieldId] ?? [];
    const values = rows.map((row) =>
      evaluateChild(node.inner, {
        ...context,
        currentLineRow: row,
      }),
    );
    return applyAggregateFunction(node.function, values);
  },
  formatCode: (node, ctx) => {
    const inner = ctx.formatChild(node.inner, { rowFieldId: node.fieldId });
    return `${node.function}_ROWS(${node.fieldId}, ${inner})`;
  },
  parseCodeCall: (keyword, ctx) => {
    const match = keyword.match(/^(SUM|COUNT|AVG|MIN|MAX)_ROWS$/) as RegExpMatchArray | null;
    if (!match) {
      return null;
    }
    if (!ctx.peekIsLParen()) {
      return null;
    }
    const fn = match[1] as AggregateFunction;
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
  },
  formatLabel: (node, ctx) => {
    const input = getInputById(ctx.config, node.fieldId);
    const table = input?.label.trim() || "…";
    const inner = ctx.formatChild(node.inner);
    return `${node.function} rows(${table}: ${inner})`;
  },
  paletteItems: (ctx) => {
    const blocks: ReturnType<NonNullable<FormulaNodeDefinition["paletteItems"]>> = [];
    for (const input of ctx.config.inputs) {
      if (!isLineItemsField(input)) {
        continue;
      }
      const label = input.label.trim() || "…";
      for (const fn of AGGREGATE_FUNCTIONS) {
        blocks.push({
          id: `rows-${fn}-${input.id}`,
          label: rowAggregateLabel(fn, label, ctx.rowsLabel),
          category: "rowAggregate",
          color: "rowAggregate",
          meta: {
            groupId: input.id,
            groupLabel: label,
            title: `${fn} ${ctx.rowsLabel}`,
            hint: label,
          },
          dragData: {
            kind: "rowAggregate",
            fieldId: input.id,
            function: fn,
          },
        });
      }
    }
    return blocks;
  },
  completions: () =>
    AGGREGATE_FUNCTIONS.map(
      (fn): FormulaCompletionItem => ({
        label: `${fn}_ROWS`,
        type: "keyword",
        insertText: `${fn}_ROWS(field_id, row.qty * row.var_cost)`,
        detail: "Line items aggregate",
      }),
    ),
};
