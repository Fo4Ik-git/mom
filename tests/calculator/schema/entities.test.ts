import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { constantEntity } from "@/lib/calculator/schema/entities/constant.entity";
import { inputEntity } from "@/lib/calculator/schema/entities/input.entity";
import { outputEntity } from "@/lib/calculator/schema/entities/output.entity";
import { parseScriptFile } from "@/lib/calculator/script/parse-file";

describe("schema entities format/parse", () => {
  const input = emptyCalculatorConfig.inputs[0]!;
  const constant = emptyCalculatorConfig.constants[0]!;
  const output = emptyCalculatorConfig.outputs[0]!;

  it("input entity round-trips via parseScriptFile", () => {
    const source = inputEntity.format({ kind: "input", data: input }, {}).join("\n");
    const parsed = parseScriptFile(source, "inputs.calc");
    expect(parsed.errors).toEqual([]);
    expect(parsed.declarations[0]?.kind).toBe("input");
    if (parsed.declarations[0]?.kind === "input") {
      expect(parsed.declarations[0].data.id).toBe(input.id);
    }
  });

  it("constant entity round-trips via parseScriptFile", () => {
    const source = constantEntity
      .format({ kind: "constant", data: constant }, {})
      .join("\n");
    const parsed = parseScriptFile(source, "constants.calc");
    expect(parsed.errors).toEqual([]);
    expect(parsed.declarations[0]?.kind).toBe("constant");
  });

  it("output entity round-trips via parseScriptFile", () => {
    const source = outputEntity
      .format({ kind: "output", data: output }, {})
      .join("\n");
    const parsed = parseScriptFile(source, "outputs.calc");
    expect(parsed.errors).toEqual([]);
    expect(parsed.declarations[0]?.kind).toBe("output");
  });

  it("calculation entity rejects auto-calc in calculations.calc tab", () => {
    const source = `calc calc_field_item_var_cost "Auto" {
  label = "Auto"
  formula { return 0 }
}`;
    const parsed = parseScriptFile(source, "calculations.calc");
    expect(
      parsed.errors.some((e) => e.message.includes("auto-calculations")),
    ).toBe(true);
  });
});
