import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import {
  buildFormulaCompletions,
  filterCompletions,
} from "@/lib/formula/code/formula-code-completions";
import { SCRIPT_FILE_OUTPUTS } from "@/lib/calculator/script/project-types";

describe("formula code completions (builder code editor)", () => {
  it("includes SUM and field references in formula mode", () => {
    const items = buildFormulaCompletions(emptyCalculatorConfig, {
      fieldId: "output_total",
    });
    expect(items.some((item) => item.label === "SUM")).toBe(true);
    expect(items.some((item) => item.label === "IF")).toBe(true);
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

  it("includes macro ids in formula completions", () => {
    const config = {
      ...emptyCalculatorConfig,
      macros: [
        {
          id: "macro_unit",
          label: "Unit cost",
          expression: { type: "empty" as const },
        },
      ],
    };
    const items = buildFormulaCompletions(config, { fieldId: "output_total" });
    expect(items.some((item) => item.label === "macro_unit")).toBe(true);
    expect(items.some((item) => item.type === "macro")).toBe(true);
  });

  it("excludes self when editing a macro formula", () => {
    const config = {
      ...emptyCalculatorConfig,
      macros: [
        {
          id: "macro_self",
          label: "Self",
          expression: { type: "empty" as const },
        },
      ],
    };
    const items = buildFormulaCompletions(config, { fieldId: "macro_self" });
    expect(items.some((item) => item.label === "macro_self")).toBe(false);
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

  it("suggests output highlight inside output block in script mode", () => {
    const source = `output output_total "Total" {
  `;
    const items = buildFormulaCompletions(
      emptyCalculatorConfig,
      { fieldId: "output_total" },
      {
        scriptMode: true,
        scriptSource: source,
        scriptPos: source.length,
        scriptFileId: SCRIPT_FILE_OUTPUTS,
      },
    );
    expect(items.some((item) => item.label === "highlight")).toBe(true);
    expect(items.some((item) => item.label === "SUM")).toBe(false);
  });

  it("suggests formula functions inside formula expression", () => {
    const source = `output output_total "Total" {
  formula {
    return SUM(`;
    const items = buildFormulaCompletions(
      emptyCalculatorConfig,
      { fieldId: "output_total" },
      {
        scriptMode: true,
        scriptSource: source,
        scriptPos: source.length,
        scriptFileId: SCRIPT_FILE_OUTPUTS,
      },
    );
    expect(items.some((item) => item.label === "field_item.var_price")).toBe(true);
  });

  it("suggests declarations at file root in script mode", () => {
    const items = buildFormulaCompletions(
      emptyCalculatorConfig,
      { fieldId: "output_total" },
      {
        scriptMode: true,
        scriptSource: "",
        scriptPos: 0,
        scriptFileId: SCRIPT_FILE_OUTPUTS,
      },
    );
    expect(items.some((item) => item.label === "output")).toBe(true);
    expect(items.some((item) => item.label === "#include")).toBe(true);
  });
});
