import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { finalizeConfig } from "@/lib/calculator/config/sync";
import { applyInputPattern } from "@/lib/calculator/config/input-patterns";
import { calculateFromConfigWithDiagnostics } from "@/lib/formula/runtime/calculate";
import { parseCalculatorScript } from "@/lib/calculator/script/parse";
import { formatCalculatorScript } from "@/lib/calculator/script/format";

const patternLabels = {
  cost: "Cost",
  price: "Price",
  unitPrice: "Unit",
  service: "Service",
  consumable: "Item",
  lineItems: "Lines",
  qty: "Qty",
  time: {
    durationHours: "H",
    durationMinutes: "M",
    ratePerHour: "R/h",
    ratePerMinute: "R/m",
  },
};

describe("builder end-to-end workflows", () => {
  it("add cost/price fields → auto calcs → calculate outputs", () => {
    let config = applyInputPattern(emptyCalculatorConfig, "costPrice", patternLabels, {
      count: 2,
      namePrefix: "Item",
    });
    config = finalizeConfig(config, "Total");

    expect(config.inputs).toHaveLength(3);
    expect((config.calculations ?? []).length).toBeGreaterThan(0);

    const quantities = Object.fromEntries(
      config.inputs.map((input) => [input.id, input.defaultQuantity ?? 1]),
    );

    const { values, warnings } = calculateFromConfigWithDiagnostics(
      config,
      quantities,
    );
    expect(Object.keys(values).length).toBeGreaterThan(0);
    expect(warnings).toEqual([]);
  });

  it("script format → parse → calculate preserves behavior", () => {
    const config = finalizeConfig(emptyCalculatorConfig, "Total");
    const script = formatCalculatorScript(config);
    const parsed = parseCalculatorScript(script, config);
    expect(parsed.errors).toEqual([]);

    const quantities = { field_item: 2 };
    const fromOriginal = calculateFromConfigWithDiagnostics(config, quantities);
    const fromParsed = calculateFromConfigWithDiagnostics(
      parsed.config!,
      quantities,
    );
    expect(fromParsed.values).toEqual(fromOriginal.values);
  });

  it("time service field produces calculable auto total", () => {
    let config = applyInputPattern(emptyCalculatorConfig, "timeService", patternLabels);
    config = finalizeConfig(config, "Total");
    const timeField = config.inputs.find((f) => f.inputMode === "time");
    expect(timeField).toBeDefined();

    const { values } = calculateFromConfigWithDiagnostics(config, {
      [timeField!.id]: 2,
    });
    const outputId = config.outputs[0]?.id;
    expect(outputId && values[outputId] !== undefined).toBe(true);
  });
});
