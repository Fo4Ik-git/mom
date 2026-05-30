import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { formatCalculatorScript } from "@/lib/calculator/script/format";
import { formatScriptProject } from "@/lib/calculator/script/format-project";
import { parseCalculatorScript } from "@/lib/calculator/script/parse";
import { parseScriptProject } from "@/lib/calculator/script/parse-project";
import { scriptProjectToMonolith } from "@/lib/calculator/script/format-project";
import { expectConfigEquivalent } from "../helpers/normalize-config";

describe("script round-trip", () => {
  it("round-trips monolith script", () => {
    const source = formatCalculatorScript(emptyCalculatorConfig);
    const parsed = parseCalculatorScript(source, emptyCalculatorConfig);
    expect(parsed.errors).toEqual([]);
    expect(parsed.config).toBeDefined();
    expectConfigEquivalent(parsed.config!, emptyCalculatorConfig);
  });

  it("round-trips multi-file project", () => {
    const project = formatScriptProject(emptyCalculatorConfig);
    const parsed = parseScriptProject(project, emptyCalculatorConfig);
    expect(parsed.errors).toEqual([]);
    expect(parsed.config).toBeDefined();
    expectConfigEquivalent(parsed.config!, emptyCalculatorConfig);
  });

  it("produces equivalent config from project and monolith", () => {
    const project = formatScriptProject(emptyCalculatorConfig);
    const monolith = scriptProjectToMonolith(project);
    const fromProject = parseScriptProject(project, emptyCalculatorConfig).config;
    const fromMonolith = parseCalculatorScript(
      monolith,
      emptyCalculatorConfig,
    ).config;
    expect(fromProject).toBeDefined();
    expect(fromMonolith).toBeDefined();
    expectConfigEquivalent(fromProject!, fromMonolith!);
  });
});
