import type {
  CalculationField,
  CalculatorConfig,
  CalculatorConstant,
  InputField,
} from "@/types/calculator";

export type InputPatternId = "blank" | "costPrice" | "timeService" | "consumables";

export interface InputPatternLabels {
  cost: string;
  price: string;
  time: string;
  hourlyRate: string;
  unitPrice: string;
  service: string;
  consumable: string;
  timeCost: string;
}

export interface InputPatternResult {
  input: InputField;
  calculations?: CalculationField[];
  constants?: CalculatorConstant[];
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
      const timeId = "var_time";
      const constId = randomId("const");
      return {
        input: {
          id: fieldId,
          label: labels.service,
          properties: [{ id: timeId, label: labels.time, value: 60 }],
          defaultQuantity: 1,
        },
        constants: [
          { id: constId, label: labels.hourlyRate, value: 500 },
        ],
        calculations: [
          {
            id: randomId("calculation"),
            label: labels.timeCost,
            expression: {
              type: "operation",
              operator: "*",
              left: {
                type: "operation",
                operator: "/",
                left: {
                  type: "operand",
                  operand: {
                    kind: "property",
                    fieldId,
                    propertyId: timeId,
                  },
                },
                right: {
                  type: "operand",
                  operand: { kind: "number", value: 60 },
                },
              },
              right: {
                type: "operand",
                operand: { kind: "constant", constantId: constId },
              },
            },
          },
        ],
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
): CalculatorConfig {
  const result = createInputFromPattern(patternId, labels);
  return {
    ...config,
    inputs: [...config.inputs, result.input],
    constants: [...(config.constants ?? []), ...(result.constants ?? [])],
    calculations: [...(config.calculations ?? []), ...(result.calculations ?? [])],
  };
}

export const INPUT_PATTERN_IDS: InputPatternId[] = [
  "blank",
  "costPrice",
  "timeService",
  "consumables",
];
