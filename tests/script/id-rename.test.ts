import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { formatScriptProject } from "@/lib/calculator/script/format-project";
import { parseScriptProject } from "@/lib/calculator/script/parse-project";

describe("script id rename propagation", () => {
  it("rewrites ids in config and project text", () => {
    const project = formatScriptProject(emptyCalculatorConfig);
    project["inputs.calc"] = project["inputs.calc"].replace(
      "field_item",
      "pos",
    );

    const parsed = parseScriptProject(project, emptyCalculatorConfig);
    expect(parsed.errors).toEqual([]);
    expect(parsed.config?.inputs[0]?.id).toBe("pos");

    const output = parsed.config?.outputs[0]?.expression;
    expect(
      output?.type === "operation" &&
        output.left.type === "operation" &&
        output.left.left.type === "operand" &&
        output.left.left.operand.kind === "property" &&
        output.left.left.operand.fieldId === "pos",
    ).toBe(true);

    expect(parsed.project?.["outputs.calc"].includes("pos.var_price")).toBe(
      true,
    );
  });
});
