import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import {
  duplicateInputField,
  finalizeConfig,
  moveInputFieldToSection,
  removeInputField,
  reorderInputFields,
  setInputFieldSection,
  updateInputField,
} from "@/lib/calculator/config/sync";

const totalLabel = "Σ";

describe("calculator config sync (builder)", () => {
  it("finalizeConfig syncs auto calculations", () => {
    const config = finalizeConfig(
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
    expect(config.calculations?.some((c) => c.id.includes("var_cost"))).toBe(
      true,
    );
  });

  it("updateInputField removes stale auto calcs on field id rename", () => {
    const synced = finalizeConfig(emptyCalculatorConfig, totalLabel);
    const field = synced.inputs[0]!;
    const renamed = { ...field, id: "pos" };
    const next = updateInputField(synced, 0, renamed, totalLabel);
    expect(
      next.calculations?.some((c) => c.id.includes("field_item")),
    ).toBe(false);
  });

  it("removeInputField drops field auto calculations", () => {
    const synced = finalizeConfig(
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
    const next = removeInputField(synced, 0);
    expect(next.inputs).toHaveLength(0);
    expect(next.calculations?.length ?? 0).toBe(0);
  });

  it("duplicateInputField inserts clone after source", () => {
    const next = duplicateInputField(emptyCalculatorConfig, 0, totalLabel, "(copy)");
    expect(next.inputs).toHaveLength(2);
    expect(next.inputs[1]?.id).not.toBe(next.inputs[0]?.id);
    expect(next.inputs[1]?.label).toContain("(copy)");
  });

  it("reorderInputFields moves field by id", () => {
    const config = {
      ...emptyCalculatorConfig,
      inputs: [
        { ...emptyCalculatorConfig.inputs[0]!, id: "a", label: "A" },
        { ...emptyCalculatorConfig.inputs[0]!, id: "b", label: "B" },
      ],
    };
    const next = reorderInputFields(config, "b", "a");
    expect(next.inputs.map((f) => f.id)).toEqual(["b", "a"]);
  });

  it("reorderInputFields no-ops on invalid ids", () => {
    const next = reorderInputFields(emptyCalculatorConfig, "missing", "field_item");
    expect(next).toBe(emptyCalculatorConfig);
  });

  it("setInputFieldSection updates section", () => {
    const next = setInputFieldSection(
      emptyCalculatorConfig,
      "field_item",
      "services",
    );
    expect(next.inputs[0]?.section).toBe("services");
  });

  it("moveInputFieldToSection moves field between sections", () => {
    const config = {
      ...emptyCalculatorConfig,
      inputs: [
        { ...emptyCalculatorConfig.inputs[0]!, id: "a", section: "materials" },
        { ...emptyCalculatorConfig.inputs[0]!, id: "b", section: "materials" },
      ],
    };
    const next = moveInputFieldToSection(config, "a", "services", "b");
    expect(next.inputs.find((f) => f.id === "a")?.section).toBe("services");
  });
});
