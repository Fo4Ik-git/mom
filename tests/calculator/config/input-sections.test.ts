import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import {
  fieldMatchesSearch,
  flattenGroupedInputs,
  groupInputsBySection,
  normalizeInputSection,
} from "@/lib/calculator/config/input-sections";

describe("input sections (builder grouping)", () => {
  it("normalizeInputSection falls back to other", () => {
    expect(normalizeInputSection("services")).toBe("services");
    expect(normalizeInputSection("unknown")).toBe("other");
  });

  it("groupInputsBySection and flattenGroupedInputs round-trip", () => {
    const inputs = [
      { ...emptyCalculatorConfig.inputs[0]!, id: "a", section: "materials" },
      { ...emptyCalculatorConfig.inputs[0]!, id: "b", section: "services" },
      { ...emptyCalculatorConfig.inputs[0]!, id: "c" },
    ];
    const groups = groupInputsBySection(inputs);
    expect(groups.get("materials")).toHaveLength(1);
    expect(groups.get("other")).toHaveLength(1);
    const flat = flattenGroupedInputs(groups);
    expect(flat.map((f) => f.id)).toEqual(["a", "b", "c"]);
  });

  it("fieldMatchesSearch matches label, id, and properties", () => {
    const field = emptyCalculatorConfig.inputs[0]!;
    expect(fieldMatchesSearch(field, "")).toBe(true);
    expect(fieldMatchesSearch(field, "позиція")).toBe(true);
    expect(fieldMatchesSearch(field, "var_cost")).toBe(true);
    expect(fieldMatchesSearch(field, "missing")).toBe(false);
  });
});
