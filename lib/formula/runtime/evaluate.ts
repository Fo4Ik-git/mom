import type { BlockExpression, CalculatorConfig } from "@/types/calculator";
import { buildInitialLineItemRowsState } from "@/lib/calculator/fields/line-items";
import {
  evaluateAllFormulaFields,
  validateFieldGraph,
} from "@/lib/formula/runtime/field-graph";

export { evaluateBlockExpression } from "@/lib/formula/runtime/block-evaluate";
export {
  calculateFromConfig,
  calculateFromConfigWithDiagnostics,
  type CalculationResult,
  type CalculationWarning,
} from "@/lib/formula/runtime/calculate";

export interface FormulaError {
  message: string;
}

function validateFieldExpression(
  label: string,
  expression: BlockExpression,
  fieldLabelPrefix: string,
): FormulaError | null {
  if (expression.type === "empty") {
    return {
      message: `${fieldLabelPrefix} «${label}»: формула порожня — додайте блоки в логіку розрахунку`,
    };
  }
  return null;
}

export function validateConfigFormulas(config: CalculatorConfig): FormulaError[] {
  const errors: FormulaError[] = [];

  for (const calculation of config.calculations ?? []) {
    const label = calculation.label.trim() || calculation.id;
    const error = validateFieldExpression(
      label,
      calculation.expression,
      "Поле розрахунку",
    );
    if (error) {
      errors.push(error);
    }
  }

  for (const output of config.outputs) {
    const label = output.label.trim() || output.id;
    const error = validateFieldExpression(label, output.expression, "Результат");
    if (error) {
      errors.push(error);
    }
  }

  for (const message of validateFieldGraph(config)) {
    errors.push({ message });
  }

  if (errors.length > 0) {
    return errors;
  }

  try {
    evaluateAllFormulaFields(
      config,
      Object.fromEntries(
        config.inputs
          .filter((input) => input.inputMode !== "lineItems")
          .map((input) => [input.id, 1]),
      ),
      undefined,
      buildInitialLineItemRowsState(config.inputs),
    );
  } catch (error) {
    errors.push({
      message:
        error instanceof Error ? error.message : "Помилка у формулах калькулятора",
    });
  }

  return errors;
}
