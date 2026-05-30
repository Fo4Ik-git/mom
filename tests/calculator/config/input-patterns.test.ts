import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import {
  applyInputPattern,
  createInputFromPattern,
  INPUT_PATTERN_IDS,
} from "@/lib/calculator/config/input-patterns";

const labels = {
  cost: "Cost",
  price: "Price",
  unitPrice: "Unit price",
  service: "Service",
  consumable: "Consumable",
  lineItems: "Line items",
  qty: "Qty",
  time: {
    durationHours: "Hours",
    durationMinutes: "Minutes",
    ratePerHour: "Rate/h",
    ratePerMinute: "Rate/min",
  },
};

describe("input patterns (builder add field)", () => {
  it("exports all pattern ids", () => {
    expect(INPUT_PATTERN_IDS).toContain("costPrice");
    expect(INPUT_PATTERN_IDS).toContain("lineItems");
    expect(INPUT_PATTERN_IDS).toContain("timeService");
  });

  it.each(INPUT_PATTERN_IDS)("createInputFromPattern(%s) returns input", (patternId) => {
    const result = createInputFromPattern(patternId, labels);
    expect(result.input.id).toMatch(/^field_/);
    expect(result.input.properties.length).toBeGreaterThan(0);
  });

  it("costPrice pattern enables auto totals", () => {
    const { input } = createInputFromPattern("costPrice", labels);
    expect(input.properties.every((p) => p.autoTotal)).toBe(true);
    expect(input.defaultQuantity).toBe(1);
  });

  it("lineItems pattern sets lineItems mode", () => {
    const { input } = createInputFromPattern("lineItems", labels);
    expect(input.inputMode).toBe("lineItems");
  });

  it("timeService pattern sets time mode", () => {
    const { input } = createInputFromPattern("timeService", labels);
    expect(input.inputMode).toBe("time");
    expect(input.timeUnit).toBe("hour");
  });

  it("applyInputPattern adds numbered labels when count > 1", () => {
    const next = applyInputPattern(emptyCalculatorConfig, "consumables", labels, {
      count: 3,
    });
    expect(next.inputs).toHaveLength(4);
    expect(next.inputs[1]?.label).toBe("Consumable 1");
    expect(next.inputs[3]?.label).toBe("Consumable 3");
  });

  it("applyInputPattern caps count at remaining field budget", () => {
    const many = {
      ...emptyCalculatorConfig,
      inputs: Array.from({ length: 48 }, (_, i) => ({
        ...emptyCalculatorConfig.inputs[0]!,
        id: `field_${i}`,
      })),
    };
    const next = applyInputPattern(many, "blank", labels, { count: 10 });
    expect(next.inputs).toHaveLength(50);
  });
});
