import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import {
  createLineItemsField,
  LINE_COST_ID,
  LINE_PRICE_ID,
  LINE_QTY_ID,
} from "@/lib/calculator/fields/line-items";
import type { EvalContext } from "@/lib/formula/runtime/block-evaluate";
import type { CalculatorConfig, InputField } from "@/types/calculator";

export { emptyCalculatorConfig };

export const evalCalculatorConfig: CalculatorConfig = {
  ...emptyCalculatorConfig,
  inputs: [
    {
      ...emptyCalculatorConfig.inputs[0]!,
      properties: [
        { id: "var_cost", label: "Cost", value: 10 },
        { id: "var_price", label: "Price", value: 20 },
      ],
    },
  ],
};

export const lineItemsField: InputField = createLineItemsField(
  "field_lines",
  "Lines",
  { qty: "Qty", cost: "Cost", price: "Price", lineItems: "Line items" },
);

export const configWithLineItems: CalculatorConfig = {
  ...evalCalculatorConfig,
  inputs: [evalCalculatorConfig.inputs[0]!, lineItemsField],
  calculations: [
    {
      id: "calc_subtotal",
      label: "Subtotal",
      expression: {
        type: "operand",
        operand: { kind: "number", value: 100 },
      },
    },
  ],
};

export function createEvalContext(overrides?: Partial<EvalContext>): EvalContext {
  return {
    quantities: { field_item: 3, field_lines: 2 },
    lineItemRows: {
      field_lines: [
        { [LINE_QTY_ID]: 2, [LINE_COST_ID]: 10, [LINE_PRICE_ID]: 15 },
        { [LINE_QTY_ID]: 1, [LINE_COST_ID]: 5, [LINE_PRICE_ID]: 8 },
      ],
    },
    inputs: configWithLineItems.inputs,
    constants: evalCalculatorConfig.constants,
    calculations: { calc_subtotal: 100 },
    outputs: {},
    ...overrides,
  };
}
