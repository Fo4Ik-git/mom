import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import {
  autoCalculationId,
  autoCalculationLabel,
  buildAutoCalculation,
  isAutoCalculationId,
  isPropertyAutoCalculationId,
  removeAutoCalculationsForField,
  syncAutoCalculations,
} from "@/lib/calculator/config/auto-calculations";

describe("auto-calculations", () => {
  const totalLabel = "total";

  it("autoCalculationId is stable and truncated", () => {
    const id = autoCalculationId("field_item", "var_cost");
    expect(id).toMatch(/^calc_field_item_var_cost/);
    expect(id.length).toBeLessThanOrEqual(48);
  });

  it("isAutoCalculationId distinguishes manual calculation ids", () => {
    expect(isAutoCalculationId("calc_field_item_var_cost")).toBe(true);
    expect(isAutoCalculationId("calculation_x7k2ab")).toBe(false);
    expect(isPropertyAutoCalculationId("calc_field_paint_var_cost")).toBe(true);
  });

  it("autoCalculationLabel combines field, property, total", () => {
    expect(autoCalculationLabel("Item", "Cost", "Σ")).toBe("Item · Cost Σ");
  });

  it("syncAutoCalculations creates auto totals for standard fields", () => {
    const config = {
      ...emptyCalculatorConfig,
      inputs: [
        {
          ...emptyCalculatorConfig.inputs[0]!,
          properties: emptyCalculatorConfig.inputs[0]!.properties.map((p) => ({
            ...p,
            autoTotal: p.id === "var_cost",
          })),
        },
      ],
    };
    const synced = syncAutoCalculations(config, totalLabel);
    const auto = synced.calculations?.find((c) =>
      isAutoCalculationId(c.id),
    );
    expect(auto).toBeDefined();
    expect(auto?.expression.type).toBe("operation");
  });

  it("syncAutoCalculations preserves custom auto-calc formulas", () => {
    const base = syncAutoCalculations(
      {
        ...emptyCalculatorConfig,
        inputs: [
          {
            ...emptyCalculatorConfig.inputs[0]!,
            properties: [{ id: "var_cost", label: "Cost", value: 0, autoTotal: true }],
          },
        ],
      },
      totalLabel,
    );
    const autoId = autoCalculationId("field_item", "var_cost");
    const custom = {
      ...base,
      calculations: base.calculations!.map((calc) =>
        calc.id === autoId
          ? {
              ...calc,
              expression: {
                type: "operand" as const,
                operand: { kind: "number" as const, value: 99 },
              },
            }
          : calc,
      ),
    };
    const resynced = syncAutoCalculations(custom, totalLabel);
    const kept = resynced.calculations?.find((c) => c.id === autoId);
    expect(kept?.expression).toEqual({
      type: "operand",
      operand: { kind: "number", value: 99 },
    });
  });

  it("removeAutoCalculationsForField removes field auto calcs only", () => {
    const calc = buildAutoCalculation(
      emptyCalculatorConfig.inputs[0]!,
      emptyCalculatorConfig.inputs[0]!.properties[0]!,
      totalLabel,
    );
    const config = {
      ...emptyCalculatorConfig,
      calculations: [
        calc,
        {
          id: "calc_manual",
          label: "Manual",
          expression: { type: "empty" as const },
        },
      ],
    };
    const next = removeAutoCalculationsForField(config, "field_item");
    expect(next.calculations?.some((c) => c.id === calc.id)).toBe(false);
    expect(next.calculations?.some((c) => c.id === "calc_manual")).toBe(true);
  });
});
