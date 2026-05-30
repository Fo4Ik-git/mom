import { describe, expect, it } from "vitest";
import { finalizeConfig } from "@/lib/calculator/config/sync";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { formatScriptProject } from "@/lib/calculator/script/format-project";
import { parseScriptProject } from "@/lib/calculator/script/parse-project";

describe("auto-calculations tab", () => {
  it("formats and parses auto calculations in dedicated tab", () => {
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
    expect(project["auto-calculations.calc"]).toContain(
      "calc_field_item_var_cost",
    );

    const customProject = {
      ...project,
      "auto-calculations.calc": project["auto-calculations.calc"].replace(
        "field_item.var_cost",
        "field_item.var_cost * 2",
      ),
    };

    const parsed = parseScriptProject(customProject, config);
    expect(parsed.errors).toEqual([]);

    const autoCalc = parsed.config?.calculations?.find(
      (calc) => calc.id === "calc_field_item_var_cost",
    );
    expect(autoCalc).toBeDefined();
    expect(
      autoCalc?.expression.type === "operation" &&
        autoCalc.expression.operator === "*",
    ).toBe(true);
  });
});
