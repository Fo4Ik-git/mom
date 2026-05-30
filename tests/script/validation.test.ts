import { describe, expect, it } from "vitest";
import { finalizeConfig } from "@/lib/calculator/config/sync";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { formatScriptProject } from "@/lib/calculator/script/format-project";
import { parseScriptProject } from "@/lib/calculator/script/parse-project";

describe("script validation", () => {
  it("rejects auto-calculation in calculations.calc tab", () => {
    const config = finalizeConfig(
      {
        ...emptyCalculatorConfig,
        inputs: [
          {
            ...emptyCalculatorConfig.inputs[0]!,
            properties: emptyCalculatorConfig.inputs[0]!.properties.map(
              (property) => ({
                ...property,
                autoTotal: true,
              }),
            ),
          },
        ],
      },
      "total",
    );

    const project = formatScriptProject(config);
    const autoBlock = project["auto-calculations.calc"];
    project["calculations.calc"] = autoBlock;
    project["auto-calculations.calc"] = "";

    const parsed = parseScriptProject(project, config);
    expect(parsed.errors.length).toBeGreaterThan(0);
    expect(
      parsed.errors.some((error) =>
        error.message.includes("auto-calculations.calc"),
      ),
    ).toBe(true);
  });

  it("reports parse errors for invalid declaration syntax", () => {
    const project = formatScriptProject(emptyCalculatorConfig);
    project["inputs.calc"] = `input broken { label = "x" `;

    const parsed = parseScriptProject(project, emptyCalculatorConfig);
    expect(parsed.errors.length).toBeGreaterThan(0);
  });
});
