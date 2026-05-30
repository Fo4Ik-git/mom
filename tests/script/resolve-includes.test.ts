import { describe, expect, it } from "vitest";
import { formatScriptProject } from "@/lib/calculator/script/format-project";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import {
  collectAllIncludedPaths,
  collectIncludedPaths,
  validateIncludeGraph,
} from "@/lib/calculator/script/resolve-includes";

describe("resolve-includes", () => {
  it("collectIncludedPaths extracts project file references", () => {
    const paths = collectIncludedPaths(`#include "inputs.calc"
#include "unknown.calc"
calc x { }`);
    expect(paths).toEqual(["inputs.calc"]);
  });

  it("collectAllIncludedPaths aggregates from all tabs", () => {
    const project = formatScriptProject(emptyCalculatorConfig);
    project["calculations.calc"] = `#include "inputs.calc"\n${project["calculations.calc"]}`;
    const included = collectAllIncludedPaths(project);
    expect(included.has("inputs.calc")).toBe(true);
  });

  it("collectIncludedPaths ignores unknown project file names", () => {
    const paths = collectIncludedPaths(`#include "missing.calc"`);
    expect(paths).toEqual([]);
  });

  it("validateIncludeGraph detects cycles", () => {
    const project = formatScriptProject(emptyCalculatorConfig);
    project["inputs.calc"] = `#include "outputs.calc"\n${project["inputs.calc"]}`;
    project["outputs.calc"] = `#include "inputs.calc"\n${project["outputs.calc"]}`;
    const errors = validateIncludeGraph(project);
    expect(errors.some((e) => e.message.includes("Include cycle"))).toBe(true);
  });
});
