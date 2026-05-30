import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import {
  buildLineItemAutoCalculation,
  createLineItemsField,
  isLineItemsField,
  lineItemAutoCalculationInner,
  LINE_COST_ID,
  LINE_QTY_ID,
} from "@/lib/calculator/fields/line-items";

describe("line items field", () => {
  const field = createLineItemsField("field_lines", "Lines", {
    qty: "Qty",
    cost: "Cost",
    price: "Price",
    lineItems: "Lines",
  });

  it("createLineItemsField sets lineItems mode and default columns", () => {
    expect(isLineItemsField(field)).toBe(true);
    expect(field.properties.map((p) => p.id)).toContain(LINE_QTY_ID);
    expect(field.properties.find((p) => p.id === LINE_COST_ID)?.autoTotal).toBe(
      true,
    );
  });

  it("lineItemAutoCalculationInner uses qty × column when qty exists", () => {
    const costProp = field.properties.find((p) => p.id === LINE_COST_ID)!;
    const inner = lineItemAutoCalculationInner(field, costProp);
    expect(inner.type).toBe("operation");
    if (inner.type === "operation") {
      expect(inner.operator).toBe("*");
    }
  });

  it("buildLineItemAutoCalculation wraps inner in row aggregate", () => {
    const calc = buildLineItemAutoCalculation(
      field,
      field.properties.find((p) => p.id === LINE_COST_ID)!,
      "Σ",
    );
    expect(calc.expression.type).toBe("rowAggregate");
    expect(calc.id).toContain("field_lines");
    expect(calc.id).toContain("var_cost");
  });
});

describe("line items migration", () => {
  it("findMigratableCostPriceGroups finds sections with 2+ cost/price fields", async () => {
    const { findMigratableCostPriceGroups, migrateCostPriceGroupToLineItems } =
      await import("@/lib/calculator/fields/line-items-migrate");

    const config = {
      ...emptyCalculatorConfig,
      inputs: [
        {
          id: "field_a",
          label: "A",
          section: "materials",
          properties: [
            { id: "var_cost", label: "Cost", value: 10, autoTotal: true },
            { id: "var_price", label: "Price", value: 20, autoTotal: true },
          ],
          defaultQuantity: 2,
        },
        {
          id: "field_b",
          label: "B",
          section: "materials",
          properties: [
            { id: "var_cost", label: "Cost", value: 5, autoTotal: true },
            { id: "var_price", label: "Price", value: 8, autoTotal: true },
          ],
          defaultQuantity: 1,
        },
      ],
    };

    const groups = findMigratableCostPriceGroups(config);
    expect(groups).toHaveLength(1);
    expect(groups[0]?.[0]).toBe("materials");

    const migrated = migrateCostPriceGroupToLineItems(config, "materials", {
      qty: "Qty",
      cost: "Cost",
      price: "Price",
      lineItems: "Table",
    }, "Σ");

    expect(migrated.inputs.some((f) => isLineItemsField(f))).toBe(true);
    expect(migrated.inputs.some((f) => f.id === "field_a")).toBe(false);
    const table = migrated.inputs.find((f) => isLineItemsField(f));
    expect(table?.defaultRows).toHaveLength(2);
  });
});
