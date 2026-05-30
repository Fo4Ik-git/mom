import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { cloneInputField } from "@/lib/calculator/config/input-field-clone";
import { finalizeConfig } from "@/lib/calculator/config/sync";
import { buildOutputFromSnippet } from "@/lib/calculator/config/output-snippets";

describe("builder field clone and output snippets", () => {
  it("cloneInputField assigns new ids and optional label suffix", () => {
    const source = emptyCalculatorConfig.inputs[0]!;
    const clone = cloneInputField(source, "(2)");
    expect(clone.id).not.toBe(source.id);
    expect(clone.properties.every((p, i) => p.id !== source.properties[i]?.id)).toBe(
      true,
    );
    expect(clone.label).toContain("(2)");
    expect(clone.presets).toEqual(source.presets);
  });

  it("buildOutputFromSnippet sumCost requires auto-total cost fields", () => {
    const config = finalizeConfig(
      {
        ...emptyCalculatorConfig,
        inputs: [
          {
            ...emptyCalculatorConfig.inputs[0]!,
            properties: [
              { id: "var_cost", label: "Собівартість", value: 0, autoTotal: true },
              { id: "var_price", label: "Ціна", value: 0, autoTotal: true },
            ],
          },
        ],
      },
      "Σ",
    );
    const sumCost = buildOutputFromSnippet(config, "sumCost", {
      sumCost: "Total cost",
      sumPrice: "Total price",
      margin: "Margin",
    });
    expect(sumCost?.label).toBe("Total cost");
    expect(sumCost?.expression.type).toBe("aggregate");

    const margin = buildOutputFromSnippet(config, "margin", {
      sumCost: "Total cost",
      sumPrice: "Total price",
      margin: "Margin",
    });
    expect(margin?.highlight).toBe(true);
    expect(margin?.expression.type).toBe("operation");
  });

  it("buildOutputFromSnippet returns null when no matching auto totals", () => {
    expect(
      buildOutputFromSnippet(emptyCalculatorConfig, "sumCost", {
        sumCost: "C",
        sumPrice: "P",
        margin: "M",
      }),
    ).toBeNull();
  });
});
