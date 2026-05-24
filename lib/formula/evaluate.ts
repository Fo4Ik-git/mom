import type { CalculatorConfig } from "@/types/calculator";
import { evaluateBlockExpression } from "@/lib/formula/block-evaluate";

export { evaluateBlockExpression } from "@/lib/formula/block-evaluate";
export {
  calculateFromConfig,
  calculateFromConfigWithDiagnostics,
  type CalculationResult,
  type CalculationWarning,
} from "@/lib/formula/calculate";

export interface FormulaError {
  message: string;
}

export function validateConfigFormulas(config: CalculatorConfig): FormulaError[] {
  const errors: FormulaError[] = [];
  const dummyQuantities = Object.fromEntries(
    config.inputs.map((input) => [input.id, 1]),
  );

  for (const output of config.outputs) {
    const outputLabel = output.label.trim() || output.id;

    if (output.expression.type === "empty") {
      errors.push({
        message: `Результат «${outputLabel}»: формула порожня — додайте блоки в логіку розрахунку`,
      });
      continue;
    }

    try {
      const priorResults: Record<string, number> = {};
      const outputIndex = config.outputs.findIndex((o) => o.id === output.id);

      for (const prior of config.outputs.slice(0, outputIndex)) {
        priorResults[prior.id] = evaluateBlockExpression(prior.expression, {
          quantities: dummyQuantities,
          inputs: config.inputs,
          constants: config.constants ?? [],
          outputs: priorResults,
        });
      }

      evaluateBlockExpression(output.expression, {
        quantities: dummyQuantities,
        inputs: config.inputs,
        constants: config.constants ?? [],
        outputs: priorResults,
      });
    } catch (error) {
      errors.push({
        message: `Результат «${outputLabel}»: ${
          error instanceof Error ? error.message : "помилка у формулі"
        }`,
      });
    }
  }

  return errors;
}
