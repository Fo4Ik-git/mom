import { describe, expect, it } from "vitest";
import { parseFormulaCode } from "@/lib/formula/code/code-parse";
import { formatExpressionViaRegistry } from "@/lib/formula/nodes/registry";
import { evaluateExpressionViaRegistry } from "@/lib/formula/nodes/registry";
import {
  emptyBlockExpression,
  emptyConditionalExpression,
} from "@/types/calculator";
import type { EvalContext } from "@/lib/formula/runtime/block-evaluate";

const target = { fieldId: "output_total" };

function numberExpr(value: number) {
  return {
    type: "operand" as const,
    operand: { kind: "number" as const, value },
  };
}

describe("IF primitive", () => {
  it("parses IF(cond, then, else)", () => {
    const parsed = parseFormulaCode("IF(1, 2, 3)", { target });
    expect(parsed).toEqual({
      type: "conditional",
      condition: numberExpr(1),
      whenTrue: numberExpr(2),
      whenFalse: numberExpr(3),
    });
  });

  it("formats IF back to code", () => {
    const expr = {
      type: "conditional" as const,
      condition: numberExpr(1),
      whenTrue: numberExpr(2),
      whenFalse: numberExpr(3),
    };
    expect(formatExpressionViaRegistry(expr, target)).toBe("IF(1, 2, 3)");
  });

  it("evaluates non-zero condition as then-branch", () => {
    const ctx: EvalContext = {
      inputs: [],
      constants: [],
      quantities: {},
      lineItemRows: {},
      calculations: {},
      outputs: {},
    };
    const expr = {
      type: "conditional" as const,
      condition: numberExpr(1),
      whenTrue: numberExpr(10),
      whenFalse: numberExpr(20),
    };
    expect(evaluateExpressionViaRegistry(expr, ctx)).toBe(10);
  });

  it("evaluates zero condition as else-branch", () => {
    const ctx: EvalContext = {
      inputs: [],
      constants: [],
      quantities: {},
      lineItemRows: {},
      calculations: {},
      outputs: {},
    };
    const expr = {
      type: "conditional" as const,
      condition: numberExpr(0),
      whenTrue: numberExpr(10),
      whenFalse: numberExpr(20),
    };
    expect(evaluateExpressionViaRegistry(expr, ctx)).toBe(20);
  });

  it("creates empty conditional from palette helper", () => {
    expect(emptyConditionalExpression()).toEqual({
      type: "conditional",
      condition: emptyBlockExpression(),
      whenTrue: emptyBlockExpression(),
      whenFalse: emptyBlockExpression(),
    });
  });
});
