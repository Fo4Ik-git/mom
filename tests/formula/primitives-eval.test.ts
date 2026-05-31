import { describe, expect, it } from "vitest";
import { parseFormulaCode } from "@/lib/formula/code/code-parse";
import { evaluateExpressionViaRegistry } from "@/lib/formula/nodes/registry";
import {
  createEvalContext,
  configWithLineItems,
} from "../helpers/fixtures";
import { DEFAULT_FORMULA_TARGET } from "../helpers/formula-roundtrip";
import { expectFormulaEval } from "../helpers/formula-roundtrip";

describe("primitive evaluation", () => {
  const ctx = createEvalContext();

  it("evaluates infix operators", () => {
    expectFormulaEval("10 + 5", 15, ctx);
    expectFormulaEval("10 - 5", 5, ctx);
    expectFormulaEval("3 * 4", 12, ctx);
    expectFormulaEval("20 / 4", 5, ctx);
  });

  it("evaluates operand references", () => {
    expectFormulaEval("field_item.qty * field_item.var_price", 60, ctx);
    expectFormulaEval("const_factor", 1.2, ctx);
    expectFormulaEval("calc_subtotal", 100, ctx);
  });

  it("evaluates ROUND", () => {
    expectFormulaEval("ROUND(1.236, 2)", 1.24, ctx);
    expectFormulaEval("ROUND(2.7)", 3, ctx);
  });

  it("evaluates aggregates", () => {
    expectFormulaEval("SUM(10, 20, 5)", 35, ctx);
    expectFormulaEval("COUNT(10, 20, 5)", 3, ctx);
    expectFormulaEval("AVG(10, 20, 30)", 20, ctx);
    expectFormulaEval("MIN(10, 20, 5)", 5, ctx);
    expectFormulaEval("MAX(10, 20, 5)", 20, ctx);
    expectFormulaEval(
      "SUM(field_item.var_cost, field_item.var_price)",
      30,
      ctx,
    );
  });

  it("evaluates row aggregates over line items", () => {
    // rows: [2*10=20 cost per row inner var_cost only -> 10, 5] -> SUM = 15
    expectFormulaEval("SUM_ROWS(field_lines, row.var_cost)", 15, ctx);
    expectFormulaEval("COUNT_ROWS(field_lines, row.var_cost)", 2, ctx);
    expectFormulaEval("AVG_ROWS(field_lines, row.var_cost)", 7.5, ctx);
    expectFormulaEval("MIN_ROWS(field_lines, row.var_cost)", 5, ctx);
    expectFormulaEval("MAX_ROWS(field_lines, row.var_cost)", 10, ctx);
    expectFormulaEval(
      "SUM_ROWS(field_lines, row.var_qty * row.var_cost)",
      25,
      ctx,
    );
  });

  it("warns and returns 0 on division by zero", () => {
    const warnings: string[] = [];
    const warnCtx = createEvalContext({
      onWarning: (message) => warnings.push(message),
    });
    const expr = parseFormulaCode("10 / 0", {
      target: DEFAULT_FORMULA_TARGET,
    });
    expect(evaluateExpressionViaRegistry(expr, warnCtx)).toBe(0);
    expect(warnings.length).toBe(1);
  });

  it("returns 0 for row aggregate on non-line-items field", () => {
    const expr = parseFormulaCode("SUM_ROWS(field_item, row.var_cost)", {
      target: DEFAULT_FORMULA_TARGET,
    });
    expect(evaluateExpressionViaRegistry(expr, ctx)).toBe(0);
  });

  it("evaluates empty expression as 0", () => {
    const expr = parseFormulaCode("", { target: DEFAULT_FORMULA_TARGET });
    expect(evaluateExpressionViaRegistry(expr, ctx)).toBe(0);
  });

  it("evaluates full output formula from default config shape", () => {
    const output = configWithLineItems.outputs[0]!.expression;
    const value = evaluateExpressionViaRegistry(output, ctx);
    // 3 * 20 + 1.2 = 61.2
    expect(value).toBeCloseTo(61.2);
  });
});
