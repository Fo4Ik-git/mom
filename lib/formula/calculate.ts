import type { CalculatorConfig } from "@/types/calculator";
import { evaluateAllFormulaFields } from "@/lib/formula/field-graph";

export interface CalculationWarning {
  outputId: string;
  outputLabel: string;
  message: string;
}

export interface CalculationResult {
  values: Record<string, number>;
  warnings: CalculationWarning[];
}

export function calculateFromConfigWithDiagnostics(
  config: CalculatorConfig,
  quantities: Record<string, number>,
): CalculationResult {
  const warnings: CalculationWarning[] = [];

  const { outputs } = evaluateAllFormulaFields(config, quantities, (field, message) => {
    warnings.push({
      outputId: field.id,
      outputLabel: field.label.trim() || field.id,
      message,
    });
  });

  return { values: outputs, warnings };
}

export function calculateFromConfig(
  config: CalculatorConfig,
  quantities: Record<string, number>,
): Record<string, number> {
  return calculateFromConfigWithDiagnostics(config, quantities).values;
}
