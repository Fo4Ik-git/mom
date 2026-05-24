import type { CalculatorConfig } from "@/types/calculator";
import { evaluateBlockExpression } from "@/lib/formula/block-evaluate";

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
  const values: Record<string, number> = {};
  const warnings: CalculationWarning[] = [];
  const constants = config.constants ?? [];

  for (const output of config.outputs) {
    const outputLabel = output.label.trim() || output.id;

    try {
      values[output.id] = evaluateBlockExpression(output.expression, {
        quantities,
        inputs: config.inputs,
        constants,
        outputs: values,
        onWarning: (message) => {
          warnings.push({ outputId: output.id, outputLabel, message });
        },
      });
    } catch (error) {
      values[output.id] = 0;
      warnings.push({
        outputId: output.id,
        outputLabel,
        message:
          error instanceof Error ? error.message : "Помилка у формулі",
      });
    }
  }

  return { values, warnings };
}

export function calculateFromConfig(
  config: CalculatorConfig,
  quantities: Record<string, number>,
): Record<string, number> {
  return calculateFromConfigWithDiagnostics(config, quantities).values;
}
