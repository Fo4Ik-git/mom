import { describe, expect, it } from "vitest";
import {
  emptyBlockExpression,
  type BlockExpression,
} from "@/types/calculator";
import {
  parseFormulaCode,
  tryParseFormulaCode,
} from "@/lib/formula/code/code-parse";
import { DEFAULT_FORMULA_TARGET } from "../helpers/formula-roundtrip";

const target = DEFAULT_FORMULA_TARGET;

describe("parseFormulaCode", () => {
  it("returns empty for blank source", () => {
    expect(parseFormulaCode("", { target })).toEqual(emptyBlockExpression());
    expect(parseFormulaCode("  // comment\n", { target })).toEqual(
      emptyBlockExpression(),
    );
  });

  it("parses numeric literals", () => {
    const expr = parseFormulaCode("42", { target });
    expect(expr).toEqual({
      type: "operand",
      operand: { kind: "number", value: 42 },
    });
  });

  it("parses property, quantity, and constant references", () => {
    expect(parseFormulaCode("field_item.var_price", { target }).type).toBe(
      "operand",
    );
    expect(parseFormulaCode("field_item.qty", { target }).type).toBe(
      "operand",
    );
    expect(parseFormulaCode("const_factor", { target }).type).toBe("operand");
  });

  it("parses calculation references", () => {
    const expr = parseFormulaCode("calc_subtotal", {
      target: { fieldId: "output_total" },
    });
    expect(expr).toEqual({
      type: "operand",
      operand: { kind: "calculation", calculationId: "calc_subtotal" },
    });
  });

  it("respects operator precedence", () => {
    const expr = parseFormulaCode("1 + 2 * 3", { target });
    expect(expr.type).toBe("operation");
    if (expr.type === "operation") {
      expect(expr.operator).toBe("+");
      expect(expr.right.type).toBe("operation");
      if (expr.right.type === "operation") {
        expect(expr.right.operator).toBe("*");
      }
    }
  });

  it("parses parentheses", () => {
    const expr = parseFormulaCode("(1 + 2) * 3", { target });
    expect(expr.type).toBe("operation");
    if (expr.type === "operation") {
      expect(expr.operator).toBe("*");
      expect(expr.left.type).toBe("group");
    }
  });

  const aggregateCases: [string, BlockExpression["type"]][] = [
    ["SUM(1, 2)", "aggregate"],
    ["COUNT(field_item.var_cost, field_item.var_price)", "aggregate"],
    ["AVG(10, 20, 30)", "aggregate"],
    ["MIN(5, 3)", "aggregate"],
    ["MAX(5, 3)", "aggregate"],
  ];

  it.each(aggregateCases)("parses aggregate %s", (source, expectedType) => {
    expect(parseFormulaCode(source, { target }).type).toBe(expectedType);
  });

  const rowAggregateCases = [
    "SUM_ROWS(field_lines, row.var_cost)",
    "COUNT_ROWS(field_lines, row.var_price)",
    "AVG_ROWS(field_lines, row.var_qty * row.var_cost)",
    "MIN_ROWS(field_lines, row.var_cost)",
    "MAX_ROWS(field_lines, row.var_price)",
  ];

  it.each(rowAggregateCases)("parses row aggregate %s", (source) => {
    expect(parseFormulaCode(source, { target }).type).toBe("rowAggregate");
  });

  it("reports syntax errors via tryParseFormulaCode", () => {
    const unclosed = tryParseFormulaCode("SUM(1, 2", { target });
    expect(unclosed.ok).toBe(false);
    if (!unclosed.ok) {
      expect(unclosed.error.length).toBeGreaterThan(0);
    }

    const unknown = tryParseFormulaCode("NOT_A_FN(1)", { target });
    expect(unknown.ok).toBe(false);
  });
});
