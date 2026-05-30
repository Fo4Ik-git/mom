import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { formatScriptProject } from "@/lib/calculator/script/format-project";
import { parseScriptProject } from "@/lib/calculator/script/parse-project";

describe("script #include", () => {
  it("expands included file content", () => {
    const project = formatScriptProject(emptyCalculatorConfig);
    project["constants.calc"] = "";
    project["calculations.calc"] = `#include "inputs.calc"

calc calc_margin "Margin" {
  label = "Margin"
  formula {
    return field_item.var_price - field_item.var_cost
  }
}`;

    const parsed = parseScriptProject(project, emptyCalculatorConfig);
    expect(parsed.errors).toEqual([]);
    expect(parsed.config?.inputs.length).toBe(1);
    expect(
      (parsed.config?.calculations ?? []).some((calc) => calc.id === "calc_margin"),
    ).toBe(true);
  });

  it("merges the same include only once", () => {
    const project = formatScriptProject(emptyCalculatorConfig);
    project["constants.calc"] = "";
    project["calculations.calc"] = `#include "inputs.calc"

calc calc_margin "Margin" {
  label = "Margin"
  formula { return field_item.var_price - field_item.var_cost }
}`;
    project["outputs.calc"] = `#include "inputs.calc"
${project["outputs.calc"]}`;

    const parsed = parseScriptProject(project, emptyCalculatorConfig);
    expect(parsed.errors).toEqual([]);
    expect(parsed.config?.inputs.length).toBe(1);
  });

  it("detects include cycles", () => {
    const project = formatScriptProject(emptyCalculatorConfig);
    project["inputs.calc"] = `#include "outputs.calc"\n${project["inputs.calc"]}`;
    project["outputs.calc"] = `#include "inputs.calc"\n${project["outputs.calc"]}`;

    const parsed = parseScriptProject(project, emptyCalculatorConfig);
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(
      parsed.errors.some((error) => error.message.includes("Include cycle")),
    ).toBe(true);
  });
});
