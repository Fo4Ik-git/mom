import { describe, expect, it } from "vitest";
import {
  collectScriptCompletions,
  detectScriptCompletionContext,
  getAllScriptBodyFieldKeys,
} from "@/lib/calculator/schema/script-completions";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { buildFormulaCompletions } from "@/lib/formula/code/formula-code-completions";
import { SCRIPT_FILE_INPUTS, SCRIPT_FILE_OUTPUTS } from "@/lib/calculator/script/project-types";

describe("script completions", () => {
  it("detects file root context", () => {
    expect(detectScriptCompletionContext("", 0).kind).toBe("file-root");
  });

  it("detects output body and suggests highlight", () => {
    const source = `output output_total "Total" {
  label = "Total"
  `;
    const ctx = detectScriptCompletionContext(source, source.length);
    expect(ctx.kind).toBe("output-body");
    expect(ctx.entityId).toBe("output_total");

    const items = collectScriptCompletions(ctx, SCRIPT_FILE_OUTPUTS);
    expect(items.some((item) => item.label === "highlight")).toBe(true);
    expect(items.some((item) => item.label === "formula")).toBe(true);
  });

  it("detects input body and suggests section", () => {
    const source = `input field_item "Item" {
  `;
    const ctx = detectScriptCompletionContext(source, source.length);
    expect(ctx.kind).toBe("input-body");

    const items = collectScriptCompletions(ctx, SCRIPT_FILE_INPUTS);
    expect(items.some((item) => item.label === "section")).toBe(true);
    expect(items.some((item) => item.label === "mode")).toBe(true);
    expect(items.some((item) => item.label === "property")).toBe(true);
  });

  it("detects property nested body fields", () => {
    const source = `input field_item "Item" {
  property var_cost {
    `;
    const ctx = detectScriptCompletionContext(source, source.length);
    expect(ctx.kind).toBe("property-body");

    const items = collectScriptCompletions(ctx, SCRIPT_FILE_INPUTS);
    expect(items.map((item) => item.label).sort()).toEqual([
      "auto_total",
      "label",
      "value",
    ]);
  });

  it("detects formula expression context inside output", () => {
    const source = `output output_total "Total" {
  formula {
    return field_item.var_`;
    const ctx = detectScriptCompletionContext(source, source.length);
    expect(ctx.kind).toBe("formula-expr");
    expect(ctx.entityId).toBe("output_total");
  });

  it("detects formula expression context inside local assignment", () => {
    const source = `output output_total "Total" {
  formula {
    local price = field_item.qty * field_item.var_`;
    const ctx = detectScriptCompletionContext(source, source.length);
    expect(ctx.kind).toBe("formula-expr");
    expect(ctx.entityId).toBe("output_total");

    const items = buildFormulaCompletions(emptyCalculatorConfig, { fieldId: "output_total" }, {
      scriptMode: true,
      scriptSource: source,
      scriptPos: source.length,
      scriptFileId: SCRIPT_FILE_OUTPUTS,
    });
    expect(items.some((item) => item.label === "field_item.var_cost")).toBe(true);
  });

  it("registers body fields from all entities", () => {
    const keys = getAllScriptBodyFieldKeys();
    expect(keys).toContain("highlight");
    expect(keys).toContain("section");
    expect(keys).toContain("auto_total");
    expect(keys).toContain("value");
  });
});
