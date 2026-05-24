import type {
  BlockExpression,
  CalculationField,
  CalculatorConfig,
  InputField,
  InputProperty,
} from "@/types/calculator";
import { quantityTimesProperty } from "@/lib/formula/expression-builders";

export function autoCalculationId(fieldId: string, propertyId: string) {
  const id = `calc_${fieldId}_${propertyId}`.replace(/__+/g, "_");
  return id.slice(0, 48);
}

export function isAutoCalculationId(id: string) {
  // Auto IDs: calc_{fieldId}_{propertyId}, e.g. calc_field_paint_var_cost
  // Manual IDs from randomId("calculation") look like calculation_x7k2ab — must not match.
  return /^calc_field_[a-z0-9_]+_[a-z][a-z0-9_]*$/.test(id);
}

export function autoCalculationLabel(
  fieldLabel: string,
  propertyLabel: string,
  totalLabel: string,
) {
  const base = fieldLabel.trim() || "…";
  const prop = propertyLabel.trim() || "…";
  return `${base} · ${prop} ${totalLabel}`;
}

export function buildAutoCalculation(
  field: InputField,
  property: InputProperty,
  totalLabel: string,
): CalculationField {
  return {
    id: autoCalculationId(field.id, property.id),
    label: autoCalculationLabel(field.label, property.label, totalLabel),
    expression: quantityTimesProperty(field.id, property.id),
  };
}

export function syncAutoCalculations(
  config: CalculatorConfig,
  totalLabel: string,
): CalculatorConfig {
  const desired = new Map<string, CalculationField>();

  for (const field of config.inputs) {
    for (const property of field.properties) {
      if (!property.autoTotal) {
        continue;
      }
      const calc = buildAutoCalculation(field, property, totalLabel);
      desired.set(calc.id, calc);
    }
  }

  const keptManual = (config.calculations ?? []).filter(
    (calc) => !isAutoCalculationId(calc.id) || desired.has(calc.id),
  );

  const manualWithoutStaleAuto = keptManual.filter(
    (calc) => !isAutoCalculationId(calc.id) || desired.has(calc.id),
  );

  const merged = [...manualWithoutStaleAuto];
  for (const [id, calc] of desired) {
    const index = merged.findIndex((item) => item.id === id);
    if (index >= 0) {
      merged[index] = calc;
    } else {
      merged.push(calc);
    }
  }

  const finalCalcs = merged.filter(
    (calc) => !isAutoCalculationId(calc.id) || desired.has(calc.id),
  );

  return {
    ...config,
    calculations: finalCalcs,
  };
}

export function removeAutoCalculationsForField(
  config: CalculatorConfig,
  fieldId: string,
): CalculatorConfig {
  return {
    ...config,
    calculations: (config.calculations ?? []).filter(
      (calc) =>
        !isAutoCalculationId(calc.id) ||
        !calc.id.startsWith(`calc_${fieldId}_`),
    ),
  };
}

export function migrateAutoCalculationIds(
  config: CalculatorConfig,
  fieldId: string,
  oldPropertyId: string,
  newPropertyId: string,
  totalLabel: string,
): CalculatorConfig {
  const oldId = autoCalculationId(fieldId, oldPropertyId);
  const newId = autoCalculationId(fieldId, newPropertyId);
  if (oldId === newId) {
    return config;
  }

  const field = config.inputs.find((input) => input.id === fieldId);
  const property = field?.properties.find((item) => item.id === newPropertyId);
  if (!field || !property?.autoTotal) {
    return {
      ...config,
      calculations: (config.calculations ?? []).filter((calc) => calc.id !== oldId),
    };
  }

  const calculations = (config.calculations ?? []).map((calc) =>
    calc.id === oldId
      ? buildAutoCalculation(field, property, totalLabel)
      : calc,
  );

  return syncAutoCalculations({ ...config, calculations }, totalLabel);
}
