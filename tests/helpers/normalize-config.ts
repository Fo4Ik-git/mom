import { expect } from "vitest";
import { isAutoCalculationId } from "@/lib/calculator/config/auto-calculations";
import type { CalculatorConfig } from "@/types/calculator";

export function normalizeConfig(config: CalculatorConfig): CalculatorConfig {
  return {
    ...config,
    inputs: config.inputs.map((input) => ({
      ...input,
      defaultQuantity:
        input.defaultQuantity === 0 ? undefined : input.defaultQuantity,
    })),
    calculations: (config.calculations ?? []).filter(
      (calc) => !isAutoCalculationId(calc.id),
    ),
    outputs: config.outputs.map((output) => {
      const next = { ...output };
      if (next.highlight === false) {
        delete next.highlight;
      }
      return next;
    }),
  };
}

export function expectConfigEquivalent(
  left: CalculatorConfig,
  right: CalculatorConfig,
) {
  expect(JSON.stringify(normalizeConfig(left))).toEqual(
    JSON.stringify(normalizeConfig(right)),
  );
}
