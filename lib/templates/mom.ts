import type { CalculatorConfig } from "@/types/calculator";

export const momTemplateConfig: CalculatorConfig = {
  version: 2,
  inputs: [
    {
      id: "field_paint",
      label: "Фарба",
      properties: [
        { id: "var_cost", label: "Собівартість", value: 100 },
        { id: "var_price", label: "Вартість", value: 200 },
      ],
      defaultQuantity: 0,
    },
  ],
  constants: [{ id: "const_factor", label: "Коефіцієнт", value: 1.2 }],
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
              fieldId: "field_paint",
              propertyId: "var_price",
            },
          },
          right: {
            type: "operand",
            operand: { kind: "quantity", fieldId: "field_paint" },
          },
        },
        right: {
          type: "operand",
          operand: { kind: "constant", constantId: "const_factor" },
        },
      },
    },
    {
      id: "output_profit",
      label: "Прибуток",
      highlight: true,
      expression: {
        type: "operation",
        operator: "-",
        left: {
          type: "operand",
          operand: { kind: "output", outputId: "output_total" },
        },
        right: {
          type: "group",
          inner: {
            type: "operation",
            operator: "*",
            left: {
              type: "operand",
              operand: {
                kind: "property",
                fieldId: "field_paint",
                propertyId: "var_cost",
              },
            },
            right: {
              type: "operand",
              operand: { kind: "quantity", fieldId: "field_paint" },
            },
          },
        },
      },
    },
  ],
};
