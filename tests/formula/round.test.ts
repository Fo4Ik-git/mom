import { describe, expect, it } from "vitest";
import { parseFormulaCode } from "@/lib/formula/code/code-parse";
import {
  evaluateExpressionViaRegistry,
  formatExpressionViaRegistry,
} from "@/lib/formula/nodes/registry";
import type { EvalContext } from "@/lib/formula/runtime/block-evaluate";
import { emptyRoundExpression } from "@/types/calculator";

const target = { fieldId: "output_total" };

function numberExpr(value: number) {
  return {
    type: "operand" as const,
    operand: { kind: "number" as const, value },
  };
}

describe("ROUND primitive", () => {
  const ctx: EvalContext = {
    inputs: [],
    constants: [],
    quantities: {},
    lineItemRows: {},
    calculations: {},
    outputs: {},
  };

  it("parses ROUND(value) with implicit zero decimals", () => {
    expect(parseFormulaCode("ROUND(1.234)", { target })).toEqual({
      type: "round",
      value: numberExpr(1.234),
      decimals: numberExpr(0),
    });
  });

  it("parses ROUND(value, decimals)", () => {
    expect(parseFormulaCode("ROUND(1.234, 2)", { target })).toEqual({
      type: "round",
      value: numberExpr(1.234),
      decimals: numberExpr(2),
    });
  });

  it("formats ROUND back to code", () => {
    const expr = {
      type: "round" as const,
      value: numberExpr(1.5),
      decimals: numberExpr(2),
    };
    expect(formatExpressionViaRegistry(expr, target)).toBe("ROUND(1.5, 2)");
  });

  it("evaluates ROUND with decimal places", () => {
    const expr = parseFormulaCode("ROUND(1.236, 2)", { target });
    expect(evaluateExpressionViaRegistry(expr, ctx)).toBe(1.24);
  });

  it("evaluates ROUND without second argument as integer rounding", () => {
    const expr = parseFormulaCode("ROUND(2.7)", { target });
    expect(evaluateExpressionViaRegistry(expr, ctx)).toBe(3);
  });

  it("creates empty round from palette helper", () => {
    expect(emptyRoundExpression().type).toBe("round");
  });
});
