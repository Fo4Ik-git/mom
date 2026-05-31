import type {
  BlockExpression,
  CalculatorConstant,
  FormulaLocal,
  InputField,
  LineItemRowsState,
} from "@/types/calculator";
import { evaluateExpressionViaRegistry } from "@/lib/formula/nodes/registry";

export interface EvalContext {
  quantities: Record<string, number>;
  lineItemRows: LineItemRowsState;
  currentLineRow?: Record<string, number>;
  inputs: InputField[];
  constants: CalculatorConstant[];
  calculations: Record<string, number>;
  outputs: Record<string, number>;
  macros?: Record<string, number>;
  locals?: Record<string, number>;
  onWarning?: (message: string) => void;
}

export function evaluateBlockExpression(
  expression: BlockExpression,
  context: EvalContext,
): number {
  return evaluateExpressionViaRegistry(expression, context);
}

export function evaluateFormulaWithLocals(
  expression: BlockExpression,
  locals: FormulaLocal[] | undefined,
  context: EvalContext,
): number {
  const localValues = computeFormulaLocalValues(locals, context);
  return evaluateBlockExpression(expression, {
    ...context,
    locals: localValues,
  });
}

export function computeFormulaLocalValues(
  locals: FormulaLocal[] | undefined,
  context: EvalContext,
): Record<string, number> {
  const localValues: Record<string, number> = { ...(context.locals ?? {}) };

  for (const local of locals ?? []) {
    localValues[local.id] = evaluateBlockExpression(local.expression, {
      ...context,
      locals: localValues,
    });
  }

  return localValues;
}
