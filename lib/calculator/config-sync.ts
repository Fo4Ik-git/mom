import type { CalculatorConfig, InputField } from "@/types/calculator";
import {
  migrateAutoCalculationIds,
  removeAutoCalculationsForField,
  syncAutoCalculations,
} from "@/lib/calculator/auto-calculations";
import { cloneInputField } from "@/lib/calculator/input-field-clone";
import {
  flattenGroupedInputs,
  groupInputsBySection,
  type InputSectionId,
} from "@/lib/calculator/input-sections";

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

export function duplicateInputField(
  config: CalculatorConfig,
  index: number,
  totalLabel: string,
  labelSuffix?: string,
): CalculatorConfig {
  const source = config.inputs[index];
  if (!source) {
    return config;
  }
  const clone = cloneInputField(source, labelSuffix);
  return finalizeConfig(
    {
      ...config,
      inputs: [
        ...config.inputs.slice(0, index + 1),
        clone,
        ...config.inputs.slice(index + 1),
      ],
    },
    totalLabel,
  );
}

export function reorderInputFields(
  config: CalculatorConfig,
  activeId: string,
  overId: string,
): CalculatorConfig {
  const oldIndex = config.inputs.findIndex((field) => field.id === activeId);
  const newIndex = config.inputs.findIndex((field) => field.id === overId);
  if (oldIndex < 0 || newIndex < 0 || oldIndex === newIndex) {
    return config;
  }
  const inputs = [...config.inputs];
  const [moved] = inputs.splice(oldIndex, 1);
  inputs.splice(newIndex, 0, moved);
  return { ...config, inputs };
}

export function setInputFieldSection(
  config: CalculatorConfig,
  fieldId: string,
  section: InputSectionId,
): CalculatorConfig {
  return {
    ...config,
    inputs: config.inputs.map((field) =>
      field.id === fieldId ? { ...field, section } : field,
    ),
  };
}

export function moveInputFieldToSection(
  config: CalculatorConfig,
  fieldId: string,
  section: InputSectionId,
  overFieldId?: string,
): CalculatorConfig {
  const groups = groupInputsBySection(config.inputs);
  const fromSection = [...groups.entries()].find(([, fields]) =>
    fields.some((field) => field.id === fieldId),
  )?.[0];
  if (!fromSection) {
    return config;
  }

  const field = config.inputs.find((item) => item.id === fieldId);
  if (!field) {
    return config;
  }

  const updatedField = { ...field, section };
  const fromList = groups.get(fromSection)!.filter((item) => item.id !== fieldId);
  groups.set(fromSection, fromList);

  const targetList = groups.get(section) ?? [];
  if (overFieldId) {
    const insertAt = targetList.findIndex((item) => item.id === overFieldId);
    if (insertAt >= 0) {
      targetList.splice(insertAt, 0, updatedField);
    } else {
      targetList.push(updatedField);
    }
  } else {
    targetList.push(updatedField);
  }
  groups.set(section, targetList);

  return { ...config, inputs: flattenGroupedInputs(groups) };
}
