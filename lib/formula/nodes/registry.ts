import type { BlockExpression, BlockOperand } from "@/types/calculator";
import type { FormulaTarget } from "@/lib/formula/core/formula-target";
import type { EvalContext } from "@/lib/formula/runtime/block-evaluate";
import type { PaletteBlock } from "@/lib/formula/blocks/block-palette-types";
import type {
  ExpressionEvaluator,
  FormulaCodeFormatContext,
  FormulaCodeParseContext,
  FormulaDisplayContext,
  FormulaNodeDefinition,
  FormulaPaletteContext,
  FormulaPrimitiveDefinition,
} from "@/lib/formula/nodes/_definition";
import { generateDefaultCompletions } from "@/lib/formula/nodes/generate-completions";
import { formatOperandCode } from "@/lib/formula/nodes/reference-code";
import { emptyNode } from "@/lib/formula/nodes/empty.node";
import { groupNode } from "@/lib/formula/nodes/group.node";
import { operandNode } from "@/lib/formula/nodes/operand.node";
import { ALL_PRIMITIVES } from "@/lib/formula/nodes/primitives";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const structuralNodes = new Map<BlockExpression["type"], FormulaNodeDefinition<any>>();

function registerStructural(definition: FormulaNodeDefinition<any>) {
  structuralNodes.set(definition.type, definition);
}

registerStructural(emptyNode);
registerStructural(groupNode);
registerStructural(operandNode);

function findPrimitive(node: BlockExpression): FormulaPrimitiveDefinition | undefined {
  return ALL_PRIMITIVES.find((primitive) => primitive.matchNode(node));
}

export function getFormulaNode(type: BlockExpression["type"]) {
  return structuralNodes.get(type);
}

export function getAllFormulaNodes() {
  return [...structuralNodes.values()];
}

export function getAllFormulaPrimitives() {
  return ALL_PRIMITIVES;
}

export { ALL_PRIMITIVES };

export function getInfixPrecedence(symbol: string): number | null {
  const primitive = ALL_PRIMITIVES.find((item) => item.infix?.symbol === symbol);
  return primitive?.infix?.precedence ?? null;
}

export function getRegisteredInfixSymbols(): string[] {
  return ALL_PRIMITIVES.filter((item) => item.infix).map(
    (item) => item.infix!.symbol,
  );
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

  const primitive = findPrimitive(expression);
  if (primitive) {
    return primitive.evaluate(expression, context, evaluateChild);
  }

  const structural = structuralNodes.get(expression.type);
  if (structural) {
    return structural.evaluate(expression as never, context, evaluateChild);
  }

  throw new Error(`Unknown expression type: ${expression.type}`);
}

function formatOperandRef(
  operand: BlockOperand,
  target: FormulaTarget,
  rowFieldId?: string,
): string {
  return formatOperandCode(operand, target, rowFieldId);
}

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

  const primitive = findPrimitive(expression);
  if (primitive?.formatCode) {
    return primitive.formatCode(expression, ctx);
  }

  const structural = structuralNodes.get(expression.type);
  if (structural?.formatCode) {
    return structural.formatCode(expression as never, ctx);
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
  return formatChildDefault(expression, target, options);
}

export function parseCodeCallViaRegistry(
  keyword: string,
  ctx: FormulaCodeParseContext,
): BlockExpression | null {
  for (const primitive of ALL_PRIMITIVES) {
    const parsed = primitive.parseCodeCall?.(keyword, ctx);
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
  const merged = new Map<
    string,
    ReturnType<NonNullable<FormulaNodeDefinition["completions"]>>[0]
  >();

  for (const structural of structuralNodes.values()) {
    for (const item of structural.completions?.(config, target) ?? []) {
      merged.set(item.label, item);
    }
  }

  for (const primitive of ALL_PRIMITIVES) {
    const items =
      primitive.completions?.(config, target) ??
      generateDefaultCompletions(primitive);
    for (const item of items) {
      merged.set(item.label, item);
    }
  }

  return [...merged.values()];
}

export function mergePaletteItems(ctx: FormulaPaletteContext): PaletteBlock[] {
  const blocks: PaletteBlock[] = [];

  for (const structural of structuralNodes.values()) {
    blocks.push(...(structural.paletteItems?.(ctx) ?? []));
  }

  for (const primitive of ALL_PRIMITIVES) {
    blocks.push(...(primitive.paletteItems?.(ctx) ?? []));
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

  const primitive = findPrimitive(expression);
  if (primitive?.formatLabel) {
    return primitive.formatLabel(expression, fullCtx);
  }

  const structural = structuralNodes.get(expression.type);
  if (structural?.formatLabel) {
    return structural.formatLabel(expression as never, fullCtx);
  }

  return "?";
}
