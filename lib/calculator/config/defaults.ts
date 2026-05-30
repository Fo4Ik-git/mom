import type { CalculatorConfig } from "@/types/calculator";

export const emptyCalculatorConfig: CalculatorConfig = {
  version: 2,
  inputs: [
    {
      id: "field_item",
      label: "Позиція",
      properties: [
        { id: "var_cost", label: "Собівартість", value: 0 },
        { id: "var_price", label: "Вартість", value: 0 },
      ],
      defaultQuantity: 0,
    },
  ],
  constants: [{ id: "const_factor", label: "Коефіцієнт", value: 1.2 }],
  calculations: [],
  outputs: [
    {
      id: "output_total",
      label: "Загальна вартість",
      expression: {
        type: "operation",
        operator: "+",
        left: {
          type: "operation",
          operator: "*",
          left: {
            type: "operand",
            operand: {
              kind: "property",
              fieldId: "field_item",
              propertyId: "var_price",
            },
          },
          right: {
            type: "operand",
            operand: { kind: "quantity", fieldId: "field_item" },
          },
        },
        right: {
          type: "operand",
          operand: { kind: "constant", constantId: "const_factor" },
        },
      },
    },
  ],
};
