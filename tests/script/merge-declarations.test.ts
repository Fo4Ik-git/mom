import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { mergeScriptDeclarations } from "@/lib/calculator/script/merge-declarations";

describe("mergeScriptDeclarations", () => {
  it("merges declarations from multiple files", () => {
    const result = mergeScriptDeclarations([
      {
        file: "inputs.calc",
        declarations: [
          {
            kind: "input",
            data: {
              id: "field_a",
              label: "A",
              properties: [{ id: "var_cost", label: "C", value: 0 }],
            },
          },
        ],
      },
      {
        file: "constants.calc",
        declarations: [
          {
            kind: "constant",
            data: { id: "const_x", label: "X", value: 1 },
          },
        ],
      },
    ]);

    expect(result.errors).toEqual([]);
    expect(result.config.inputs).toHaveLength(1);
    expect(result.config.constants).toHaveLength(1);
  });

  it("reports duplicate ids across files", () => {
    const decl = {
      kind: "constant" as const,
      data: { id: "const_dup", label: "Dup", value: 0 },
    };
    const result = mergeScriptDeclarations([
      { file: "constants.calc", declarations: [decl] },
      { file: "outputs.calc", declarations: [decl] },
    ]);
    expect(result.errors.length).toBe(1);
    expect(result.errors[0]?.message).toContain("Duplicate id");
  });

  it("falls back to base config sections when file empty", () => {
    const result = mergeScriptDeclarations(
      [{ file: "inputs.calc", declarations: [] }],
      emptyCalculatorConfig,
    );
    expect(result.config.inputs).toEqual(emptyCalculatorConfig.inputs);
  });
});
