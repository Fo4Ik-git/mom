import type {
  CalculationField,
  CalculatorConfig,
  InputField,
} from "@/types/calculator";
import {
  createLineItemsField,
  isLineItemsField,
  type LineItemsLabels,
} from "@/lib/calculator/line-items";
import {
  createTimeServiceField,
  type TimeServiceLabels,
} from "@/lib/calculator/time-service";

export type InputPatternId =
  | "blank"
  | "costPrice"
  | "timeService"
  | "consumables"
  | "lineItems";

export interface InputPatternLabels {
  cost: string;
  price: string;
  unitPrice: string;
  service: string;
  consumable: string;
  lineItems: string;
  qty: string;
  time: TimeServiceLabels;
}

export interface InputPatternResult {
  input: InputField;
  calculations?: CalculationField[];
}

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createInputFromPattern(
  patternId: InputPatternId,
  labels: InputPatternLabels,
): InputPatternResult {
  const fieldId = randomId("field");

  switch (patternId) {
    case "costPrice": {
      const costId = "var_cost";
      const priceId = "var_price";
      return {
        input: {
          id: fieldId,
          label: "",
          properties: [
            { id: costId, label: labels.cost, value: 0, autoTotal: true },
            { id: priceId, label: labels.price, value: 0, autoTotal: true },
          ],
          defaultQuantity: 1,
        },
      };
    }
    case "timeService": {
      return {
        input: createTimeServiceField(fieldId, labels.service, labels.time, {
          timeUnit: "hour",
          duration: 1,
          rate: 500,
          defaultQuantity: 1,
        }),
      };
    }
    case "consumables": {
      const priceId = "var_price";
      return {
        input: {
          id: fieldId,
          label: labels.consumable,
          properties: [
            { id: priceId, label: labels.unitPrice, value: 0, autoTotal: true },
          ],
          defaultQuantity: 1,
          presets: [150, 200, 250, 400, 500],
        },
      };
    }
    case "lineItems": {
      return {
        input: createLineItemsField(fieldId, labels.lineItems, {
          qty: labels.qty,
          cost: labels.cost,
          price: labels.price,
          lineItems: labels.lineItems,
        }),
      };
    }
    case "blank":
    default:
      return {
        input: {
          id: fieldId,
          label: "",
          properties: [
            { id: "var_cost", label: labels.cost, value: 0 },
            { id: "var_price", label: labels.price, value: 0 },
          ],
          defaultQuantity: 0,
        },
      };
  }
}

export function applyInputPattern(
  config: CalculatorConfig,
  patternId: InputPatternId,
  labels: InputPatternLabels,
  options?: { count?: number; section?: string; namePrefix?: string },
): CalculatorConfig {
  const count = Math.min(Math.max(options?.count ?? 1, 1), 50 - config.inputs.length);
  const newInputs: InputField[] = [];
  const newCalculations: CalculationField[] = [];

  const namePrefix = options?.namePrefix ?? defaultPatternNamePrefix(patternId, labels);

  for (let i = 0; i < count; i += 1) {
    const result = createInputFromPattern(patternId, labels);
    const numberedLabel =
      count > 1 && namePrefix
        ? `${namePrefix} ${i + 1}`
        : result.input.label;

    newInputs.push({
      ...result.input,
      label: numberedLabel,
      section: options?.section ?? result.input.section,
    });
    if (result.calculations?.length) {
      newCalculations.push(...result.calculations);
    }
  }

  return {
    ...config,
    inputs: [...config.inputs, ...newInputs],
    calculations: [...(config.calculations ?? []), ...newCalculations],
  };
}

function defaultPatternNamePrefix(
  patternId: InputPatternId,
  labels: InputPatternLabels,
): string {
  switch (patternId) {
    case "timeService":
      return labels.service;
    case "consumables":
      return labels.consumable;
    case "lineItems":
      return labels.lineItems;
    case "costPrice":
    case "blank":
    default:
      return "";
  }
}

export const INPUT_PATTERN_IDS: InputPatternId[] = [
  "blank",
  "costPrice",
  "lineItems",
  "timeService",
  "consumables",
];
