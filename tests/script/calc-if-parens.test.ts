import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { calculationEntity } from "@/lib/calculator/schema/entities/calculation.entity";
import { parseEntityHeader } from "@/lib/calculator/schema/patterns/structured-block";
import { formatExpressionViaRegistry } from "@/lib/formula/nodes/registry";
import { normalizeParsedExpression } from "@/lib/formula/code/code-parse";

describe("calc script with IF and parentheses", () => {
  const source = `calc calc_id {
  label = "Label"
  formula {
    return IF(field_item.qty >= 10, ((field_item.qty * field_item.var_cost) * 1.2) + 1, field_item.qty * field_item.var_cost)
  }
}`;

  it("parses without errors", () => {
    const header = parseEntityHeader('calc calc_id {', "calc");
    expect(header).toBeTruthy();
    const body = source.slice(source.indexOf("{") + 1, source.lastIndexOf("}"));
    const result = calculationEntity.parseBody!(body, header!, {
      fileId: "calculations.calc",
    });
    expect(result).not.toHaveProperty("error");
    if ("error" in result) {
      return;
    }
    expect(result.kind).toBe("calculation");
    if (result.kind === "calculation") {
      const formatted = formatExpressionViaRegistry(result.data.expression, {
        fieldId: "calc_id",
      });
      expect(formatted).toBe(
        "IF(field_item.qty >= 10, ((field_item.qty * field_item.var_cost) * 1.2) + 1, field_item.qty * field_item.var_cost)",
      );
      if (result.data.expression.type === "conditional") {
        expect(result.data.expression.whenTrue.type).toBe("operation");
        if (result.data.expression.whenTrue.type === "operation") {
          expect(result.data.expression.whenTrue.left.type).toBe("group");
        }
      }
    }
  });

  it("round-trips through entity format", () => {
    const header = parseEntityHeader("calc calc_id {", "calc")!;
    const body = source.slice(source.indexOf("{") + 1, source.lastIndexOf("}"));
    const parsed = calculationEntity.parseBody!(body, header, {
      fileId: "calculations.calc",
    });
    if ("error" in parsed || parsed.kind !== "calculation") {
      throw new Error("parse failed");
    }
    const lines = calculationEntity.format(parsed, {
      config: emptyCalculatorConfig,
      includeAutoCalculations: false,
    });
    const text = lines.join("\n");
    expect(text).toContain(
      "((field_item.qty * field_item.var_cost) * 1.2) + 1",
    );
  });
});
