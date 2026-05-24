import type { CalculatorConfig, InputField } from "@/types/calculator";
import {
  migrateAutoCalculationIds,
  removeAutoCalculationsForField,
  syncAutoCalculations,
} from "@/lib/calculator/auto-calculations";

export function updateInputField(
  config: CalculatorConfig,
  index: number,
  field: InputField,
  totalLabel: string,
): CalculatorConfig {
  const previous = config.inputs[index];
  let next = {
    ...config,
    inputs: config.inputs.map((item, i) => (i === index ? field : item)),
  };

  if (previous && previous.id !== field.id) {
    next = removeAutoCalculationsForField(next, previous.id);
  }

  if (previous) {
    for (const property of field.properties) {
      const oldProperty = previous.properties.find(
        (item) => item.id === property.id || item.label === property.label,
      );
      if (oldProperty && oldProperty.id !== property.id && property.autoTotal) {
        next = migrateAutoCalculationIds(
          next,
          field.id,
          oldProperty.id,
          property.id,
          totalLabel,
        );
      }
    }
  }

  return syncAutoCalculations(next, totalLabel);
}

export function removeInputField(
  config: CalculatorConfig,
  index: number,
): CalculatorConfig {
  const field = config.inputs[index];
  if (!field) {
    return config;
  }
  const next = {
    ...config,
    inputs: config.inputs.filter((_, i) => i !== index),
  };
  return removeAutoCalculationsForField(next, field.id);
}

export function finalizeConfig(
  config: CalculatorConfig,
  totalLabel: string,
): CalculatorConfig {
  return syncAutoCalculations(config, totalLabel);
}
