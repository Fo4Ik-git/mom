import { describe, expect, it } from "vitest";
import { parseFormulaCode } from "@/lib/formula/code/code-parse";
import { normalizeParsedExpression } from "@/lib/formula/code/code-parse";
import { formatExpressionViaRegistry } from "@/lib/formula/nodes/registry";
import { evaluateExpressionViaRegistry } from "@/lib/formula/nodes/registry";
import type { EvalContext } from "@/lib/formula/runtime/block-evaluate";

const target = { fieldId: "output_total" };

function evalCtx(): EvalContext {
  return {
    inputs: [],
    constants: [],
    quantities: {},
    lineItemRows: {},
    calculations: {},
    outputs: {},
  };
}

describe("comparison operators", () => {
  const cases = [
    ["10 > 3", 1],
    ["3 > 10", 0],
    ["3 < 10", 1],
    ["10 <= 10", 1],
    ["10 >= 11", 0],
    ["5 == 5", 1],
    ["5 == 6", 0],
    ["5 != 6", 1],
    ["5 != 5", 0],
  ] as const;

  it.each(cases)("evaluates %s as %i", (source, expected) => {
    const expr = parseFormulaCode(source, { target });
    expect(evaluateExpressionViaRegistry(expr, evalCtx())).toBe(expected);
  });

  it("respects arithmetic precedence before comparison", () => {
    const expr = parseFormulaCode("1 + 2 > 2", { target });
    expect(expr.type).toBe("operation");
    if (expr.type === "operation") {
      expect(expr.operator).toBe(">");
      expect(expr.left.type).toBe("operation");
      if (expr.left.type === "operation") {
        expect(expr.left.operator).toBe("+");
      }
    }
    expect(evaluateExpressionViaRegistry(expr, evalCtx())).toBe(1);
  });

  it("round-trips >= and !=", () => {
    const source = "field_item.var_price >= field_item.var_cost";
    const expr = parseFormulaCode(source, { target });
    expect(formatExpressionViaRegistry(expr, target)).toBe(source);

    const neq = parseFormulaCode("const_factor != 0", { target });
    expect(formatExpressionViaRegistry(neq, target)).toBe("const_factor != 0");
  });

  it("preserves parentheses inside IF through normalize and format", () => {
    const source =
      "IF(field_item.qty >= 10, ((field_item.qty * field_item.var_cost) * 1.2) + 1, field_item.qty * field_item.var_cost)";
    const parsed = parseFormulaCode(source, { target });
    const normalized = normalizeParsedExpression(parsed);
    expect(normalized.type).toBe("conditional");
    if (normalized.type === "conditional") {
      expect(normalized.whenTrue.type).toBe("operation");
      if (normalized.whenTrue.type === "operation") {
        expect(normalized.whenTrue.left.type).toBe("group");
      }
    }
    const formatted = formatExpressionViaRegistry(normalized, target);
    expect(formatted).toBe(source);
    expect(parseFormulaCode(formatted, { target })).toEqual(parsed);
  });

  it("works inside IF", () => {
    const expr = parseFormulaCode(
      "IF(field_item.qty > 10, 100, 0)",
      { target },
    );
    expect(expr.type).toBe("conditional");
  });
});
