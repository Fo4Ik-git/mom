import type {
  BlockExpression,
  CalculatorConstant,
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
  onWarning?: (message: string) => void;
}

export function evaluateBlockExpression(
  expression: BlockExpression,
  context: EvalContext,
): number {
  return evaluateExpressionViaRegistry(expression, context);
}
