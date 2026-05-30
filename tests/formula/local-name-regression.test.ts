import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { outputEntity } from "@/lib/calculator/schema/entities/output.entity";
import { parseEntityHeader } from "@/lib/calculator/schema/patterns/structured-block";
import { parseScriptProject } from "@/lib/calculator/script/parse-project";
import { buildOutputBreakdowns } from "@/lib/formula/blocks/block-format-values";
import { calculateFromConfigWithDiagnostics } from "@/lib/formula/runtime/calculate";
import {
  parseCalculatorConfig,
  serializeCalculatorConfig,
} from "@/types/calculator";

const outputsSource = `output output_total {
  label = "Загальна вартість"
  highlight = true
  formula {
    local name = field_item.qty * field_item.var_price
    return IF(field_item.qty >= 10, name + const_factor, name)
  }
}`;

function configWithPrice(price: number) {
  return {
    ...emptyCalculatorConfig,
    inputs: [
      {
        ...emptyCalculatorConfig.inputs[0]!,
        properties: [
          { id: "var_cost", label: "Cost", value: 10 },
          { id: "var_price", label: "Price", value: price },
        ],
        defaultQuantity: 10,
      },
    ],
  };
}

describe("local variable name", () => {
  it("parses local id name and keeps formula expression", () => {
    const header = parseEntityHeader("output output_total {", "output")!;
    const body = outputsSource.slice(
      outputsSource.indexOf("{") + 1,
      outputsSource.lastIndexOf("}"),
    );
    const parsed = outputEntity.parseBody!(body, header);
    expect(parsed).not.toHaveProperty("error");
    if ("error" in parsed || parsed.kind !== "output") {
      throw new Error("parse failed");
    }

    expect(parsed.data.locals).toHaveLength(1);
    expect(parsed.data.locals?.[0]?.id).toBe("name");
    expect(parsed.data.expression.type).toBe("conditional");
  });

  it("evaluates name local with non-zero var_price", () => {
    const project = {
      "inputs.calc": "",
      "constants.calc": "",
      "auto-calculations.calc": "",
      "calculations.calc": "",
      "outputs.calc": outputsSource,
    };
    const result = parseScriptProject(project, configWithPrice(20));
    expect(result.errors).toEqual([]);

    const quantities = { field_item: 10 };
    const { values } = calculateFromConfigWithDiagnostics(
      result.config!,
      quantities,
    );
    expect(values.output_total).toBe(201.2);

    const breakdowns = buildOutputBreakdowns(
      result.config!,
      quantities,
      values,
    );
    expect(breakdowns.output_total).toBe(
      "name = 200; IF(10 ≥ 10, 200 + 1.20, 200) = 201.20",
    );
  });

  it("survives config JSON round-trip", () => {
    const project = {
      "inputs.calc": "",
      "constants.calc": "",
      "auto-calculations.calc": "",
      "calculations.calc": "",
      "outputs.calc": outputsSource,
    };
    const parsed = parseScriptProject(project, configWithPrice(20));
    const json = serializeCalculatorConfig(parsed.config!);
    const loaded = parseCalculatorConfig(json);

    const quantities = { field_item: 10 };
    const { values } = calculateFromConfigWithDiagnostics(loaded, quantities);
    expect(values.output_total).toBe(201.2);
    expect(loaded.outputs[0]?.locals?.[0]?.id).toBe("name");
  });
});
