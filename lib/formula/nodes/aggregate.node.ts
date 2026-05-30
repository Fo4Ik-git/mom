import { filledAggregateArgs } from "@/lib/formula/aggregate-helpers";
import { AGGREGATE_FUNCTIONS } from "@/types/calculator";
import type { AggregateFunction } from "@/types/calculator";
import { emptyBlockExpression } from "@/types/calculator";
import type { FormulaNodeDefinition } from "@/lib/formula/nodes/_definition";
import type { FormulaCompletionItem } from "@/lib/formula/formula-code-completions";
import { applyAggregateFunction } from "@/lib/formula/nodes/_shared";

export const aggregateNode: FormulaNodeDefinition<"aggregate"> = {
  type: "aggregate",
  evaluate: (node, context, evaluateChild) => {
    const values = filledAggregateArgs(node.args).map((arg) =>
      evaluateChild(arg, context),
    );
    return applyAggregateFunction(node.function, values);
  },
  formatCode: (node, ctx) => {
    const args = filledAggregateArgs(node.args)
      .map((arg) => ctx.formatChild(arg, { rowFieldId: ctx.rowFieldId }))
      .join(", ");
    return `${node.function}(${args})`;
  },
  parseCodeCall: (keyword, ctx) => {
    if (!(AGGREGATE_FUNCTIONS as readonly string[]).includes(keyword)) {
      return null;
    }
    if (!ctx.peekIsLParen()) {
      ctx.fail(`Expected "(" after ${keyword}`, ctx.identEnd);
    }
    ctx.expectLParen();
    const args = ctx.parseArgumentList();
    ctx.expectRParen();
    return {
      type: "aggregate",
      function: keyword as AggregateFunction,
      args: args.length > 0 ? args : [emptyBlockExpression()],
    };
  },
  formatLabel: (node, ctx) => {
    const parts = filledAggregateArgs(node.args).map((arg) => ctx.formatChild(arg));
    const inner = parts.length > 0 ? parts.join(", ") : "…";
    return `${node.function}(${inner})`;
  },
  paletteItems: () =>
    AGGREGATE_FUNCTIONS.map((fn) => ({
      id: `agg-${fn}`,
      label: fn,
      category: "aggregate" as const,
      color: "aggregate" as const,
      meta: {
        title: fn,
        hint: `${fn}( … )`,
      },
      dragData: { kind: "aggregate" as const, function: fn },
    })),
  completions: () =>
    AGGREGATE_FUNCTIONS.map(
      (fn): FormulaCompletionItem => ({
        label: fn,
        type: "keyword",
        insertText: `${fn}($0)`,
      }),
    ),
};
