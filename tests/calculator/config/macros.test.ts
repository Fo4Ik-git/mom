import { describe, expect, it } from "vitest";
import {
  evaluateMacros,
  validateMacros,
} from "@/lib/calculator/config/macros";
import type { CalculatorConfig } from "@/types/calculator";

describe("formula macros", () => {
  const base: CalculatorConfig = {
    version: 2,
    inputs: [
      {
        id: "field_item",
        label: "Item",
        properties: [{ id: "var_price", label: "Price", value: 10 }],
        defaultQuantity: 2,
      },
    ],
    constants: [],
    macros: [
      {
        id: "macro_unit",
        label: "Unit",
        expression: {
          type: "operand",
          operand: {
            kind: "property",
            fieldId: "field_item",
            propertyId: "var_price",
          },
        },
      },
    ],
    calculations: [],
    outputs: [
      {
        id: "output_total",
        label: "Total",
        expression: {
          type: "operand",
          operand: { kind: "macro", macroId: "macro_unit" },
        },
      },
    ],
  };

  it("evaluates macros from inputs", () => {
    const values = evaluateMacros(
      base,
      { field_item: 2 },
      {},
      {},
      {},
    );
    expect(values.macro_unit).toBe(10);
  });

  it("rejects macros that reference outputs", () => {
    const config: CalculatorConfig = {
      ...base,
      macros: [
        {
          id: "macro_bad",
          label: "Bad",
          expression: {
            type: "operand",
            operand: { kind: "output", outputId: "output_total" },
          },
        },
      ],
    };
    expect(validateMacros(config).length).toBeGreaterThan(0);
  });
});
