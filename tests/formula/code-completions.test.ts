import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import {
  buildFormulaCompletions,
  filterCompletions,
} from "@/lib/formula/code/formula-code-completions";

describe("formula code completions (builder code editor)", () => {
  it("includes SUM and field references", () => {
    const items = buildFormulaCompletions(emptyCalculatorConfig, {
      fieldId: "output_total",
    });
    expect(items.some((item) => item.label === "SUM")).toBe(true);
    expect(items.some((item) => item.label.includes("field_item"))).toBe(true);
    expect(items.some((item) => item.label === "const_factor")).toBe(true);
  });

  it("filters completions by query case-insensitively", () => {
    const items = buildFormulaCompletions(emptyCalculatorConfig, {
      fieldId: "output_total",
    });
    const filtered = filterCompletions(items, "sum");
    expect(filtered.every((item) => item.label.toLowerCase().includes("sum"))).toBe(
      true,
    );
  });

  it("excludes self-referencing calc/output target", () => {
    const config = {
      ...emptyCalculatorConfig,
      calculations: [
        {
          id: "calc_self",
          label: "Self",
          expression: { type: "empty" as const },
        },
      ],
    };
    const items = buildFormulaCompletions(config, { fieldId: "calc_self" });
    expect(items.some((item) => item.label === "calc_self")).toBe(false);
  });

  it("adds script keywords in scriptMode", () => {
    const items = buildFormulaCompletions(
      emptyCalculatorConfig,
      { fieldId: "output_total" },
      { scriptMode: true },
    );
    expect(items.some((item) => item.label === "input")).toBe(true);
    expect(items.some((item) => item.label === "calc")).toBe(true);
  });
});
