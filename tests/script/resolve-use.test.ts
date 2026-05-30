import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { parseScriptProject } from "@/lib/calculator/script/parse-project";
import type { ScriptProject } from "@/lib/calculator/script/project-types";
import {
  applyTemplateUses,
  collectUsePaths,
  stripUseLines,
} from "@/lib/calculator/script/resolve-use";
import { SCRIPT_PROJECT_FILES } from "@/lib/calculator/script/project-types";

describe("resolve-use", () => {
  it("collects and strips #use lines", () => {
    const source = `#use "print-shop-basic"\ninput extra { label = "x" }`;
    expect(collectUsePaths(source)).toEqual(["print-shop-basic"]);
    expect(stripUseLines(source)).toBe('input extra { label = "x" }');
  });

  it("merges print-shop-basic template", () => {
    const project = Object.fromEntries(
      SCRIPT_PROJECT_FILES.map((fileId) => [fileId, ""]),
    ) as ScriptProject;
    project["inputs.calc"] = '#use "print-shop-basic"';

    const { project: merged, errors } = applyTemplateUses(project);
    expect(errors).toEqual([]);
    expect(merged["inputs.calc"]).toContain("input field_item");
    expect(merged["constants.calc"]).toContain("constant const_markup");
    expect(merged["outputs.calc"]).toContain("output output_total");
  });

  it("parses project with #use into valid config", () => {
    const project = Object.fromEntries(
      SCRIPT_PROJECT_FILES.map((fileId) => [fileId, ""]),
    ) as ScriptProject;
    project["inputs.calc"] = '#use "print-shop-basic"';

    const parsed = parseScriptProject(project, emptyCalculatorConfig);
    expect(parsed.errors).toEqual([]);
    expect(parsed.config?.inputs.some((i) => i.id === "field_item")).toBe(true);
    expect(parsed.config?.outputs.some((o) => o.id === "output_total")).toBe(true);
  });

  it("rejects unknown template", () => {
    const project = Object.fromEntries(
      SCRIPT_PROJECT_FILES.map((fileId) => [fileId, ""]),
    ) as ScriptProject;
    project["inputs.calc"] = '#use "missing-template"';

    const parsed = parseScriptProject(project, emptyCalculatorConfig);
    expect(parsed.config).toBeNull();
    expect(parsed.errors[0]?.message).toContain("Unknown template");
  });

  it("accepts platform alias", () => {
    const project = Object.fromEntries(
      SCRIPT_PROJECT_FILES.map((fileId) => [fileId, ""]),
    ) as ScriptProject;
    project["inputs.calc"] = '#use "platform/templates/print-shop"';

    const { errors } = applyTemplateUses(project);
    expect(errors).toEqual([]);
  });
});
