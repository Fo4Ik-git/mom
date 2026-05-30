import type { BlockExpression, BlockOperand } from "@/types/calculator";
import type { FormulaTarget } from "@/lib/formula/formula-target";
import type { EvalContext } from "@/lib/formula/block-evaluate";
import type { PaletteBlock } from "@/lib/formula/block-palette-types";
import type {
  ExpressionEvaluator,
  FormulaCodeFormatContext,
  FormulaCodeParseContext,
  FormulaDisplayContext,
  FormulaNodeDefinition,
  FormulaPaletteContext,
} from "@/lib/formula/nodes/_definition";
import { formatOperandCode } from "@/lib/formula/nodes/reference-code";
import { aggregateNode } from "@/lib/formula/nodes/aggregate.node";
import { emptyNode } from "@/lib/formula/nodes/empty.node";
import { groupNode } from "@/lib/formula/nodes/group.node";
import { operandNode } from "@/lib/formula/nodes/operand.node";
import { operationNode } from "@/lib/formula/nodes/operation.node";
import { rowAggregateNode } from "@/lib/formula/nodes/row-aggregate.node";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const nodes = new Map<BlockExpression["type"], FormulaNodeDefinition<any>>();

function register(definition: FormulaNodeDefinition<any>) {
  nodes.set(definition.type, definition);
}

register(emptyNode);
register(operandNode);
register(groupNode);
register(operationNode);
register(aggregateNode);
register(rowAggregateNode);

export function getFormulaNode(type: BlockExpression["type"]) {
  return nodes.get(type);
}

export function getAllFormulaNodes() {
  return [...nodes.values()];
}

export function evaluateExpressionViaRegistry(
  expression: BlockExpression,
  context: EvalContext,
): number {
  const evaluateChild: ExpressionEvaluator = (child, ctx) =>
    evaluateExpressionViaRegistry(child, ctx);

  if (expression.type === "empty") {
    return emptyNode.evaluate(expression, context, evaluateChild);
  }

  const definition = nodes.get(expression.type);
  if (!definition) {
    throw new Error(`Unknown expression type: ${expression.type}`);
  }

  return definition.evaluate(expression, context, evaluateChild);
}

function formatOperandRef(
  operand: BlockOperand,
  target: FormulaTarget,
  rowFieldId?: string,
): string {
  return formatOperandCode(operand, target, rowFieldId);
}

const PREC: Record<string, number> = {
  "+": 1,
  "-": 1,
  "*": 2,
  "/": 2,
};

function formatChildDefault(
  expression: BlockExpression,
  target: FormulaTarget,
  options?: { rowFieldId?: string; parentPrec?: number; isRightOperand?: boolean },
): string {
  if (expression.type === "empty") {
    return "";
  }

  const ctx: FormulaCodeFormatContext = {
    target,
    rowFieldId: options?.rowFieldId,
    formatChild: (child, childOptions) =>
      formatChildDefault(child, target, {
        rowFieldId: childOptions?.rowFieldId ?? options?.rowFieldId,
        parentPrec: childOptions?.parentPrec,
        isRightOperand: childOptions?.isRightOperand,
      }),
    formatOperand: (operand, rowFieldId) =>
      formatOperandRef(operand, target, rowFieldId ?? options?.rowFieldId),
  };

  const definition = nodes.get(expression.type);
  if (definition?.formatCode) {
    return definition.formatCode(expression, ctx);
  }

  return "?";
}

export function formatExpressionViaRegistry(
  expression: BlockExpression,
  target: FormulaTarget,
  options?: { rowFieldId?: string },
): string {
  if (expression.type === "empty") {
    return "";
  }

  if (expression.type === "operation") {
    const prec = PREC[expression.operator] ?? 0;
    const leftStr = formatChildDefault(expression.left, target, {
      rowFieldId: options?.rowFieldId,
      parentPrec: prec,
    });
    const rightStr = formatChildDefault(expression.right, target, {
      rowFieldId: options?.rowFieldId,
      parentPrec: prec,
      isRightOperand: true,
    });
    let result = `${leftStr} ${expression.operator} ${rightStr}`;
    if (
      expression.right.type === "operation" &&
      (PREC[expression.right.operator] ?? 0) <= prec &&
      (expression.operator === "-" || expression.operator === "/")
    ) {
      result = `${leftStr} ${expression.operator} (${rightStr})`;
    }
    return result;
  }

  return formatChildDefault(expression, target, options);
}

export function parseCodeCallViaRegistry(
  keyword: string,
  ctx: FormulaCodeParseContext,
): BlockExpression | null {
  for (const node of nodes.values()) {
    const parsed = node.parseCodeCall?.(keyword, ctx);
    if (parsed) {
      return parsed;
    }
  }
  return null;
}

export function mergeNodeCompletions(
  config: Parameters<NonNullable<FormulaNodeDefinition["completions"]>>[0],
  target: FormulaTarget,
) {
  const merged = new Map<string, ReturnType<NonNullable<FormulaNodeDefinition["completions"]>>[0]>();
  for (const node of nodes.values()) {
    for (const item of node.completions?.(config, target) ?? []) {
      merged.set(item.label, item);
    }
  }
  return [...merged.values()];
}

export function mergePaletteItems(ctx: FormulaPaletteContext): PaletteBlock[] {
  const blocks: PaletteBlock[] = [];
  for (const node of nodes.values()) {
    blocks.push(...(node.paletteItems?.(ctx) ?? []));
  }
  return blocks;
}

export function formatExpressionLabelViaRegistry(
  expression: BlockExpression,
  ctx: Omit<FormulaDisplayContext, "formatChild">,
): string {
  const fullCtx: FormulaDisplayContext = {
    ...ctx,
    formatChild: (child) => formatExpressionLabelViaRegistry(child, ctx),
  };

  if (expression.type === "empty") {
    return emptyNode.formatLabel?.(expression, fullCtx) ?? "…";
  }

  const definition = nodes.get(expression.type);
  if (definition?.formatLabel) {
    return definition.formatLabel(expression, fullCtx);
  }

  return "?";
}
