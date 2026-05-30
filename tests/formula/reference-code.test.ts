import { describe, expect, it } from "vitest";
import { parseFormulaCode } from "@/lib/formula/code/code-parse";
import { DEFAULT_FORMULA_TARGET } from "../helpers/formula-roundtrip";

describe("row references in code", () => {
  it("allows row.* only inside *_ROWS inner expression", () => {
    expect(() =>
      parseFormulaCode("row.var_cost", { target: DEFAULT_FORMULA_TARGET }),
    ).toThrow(/only valid inside \*_ROWS/);

    const expr = parseFormulaCode("SUM_ROWS(field_lines, row.var_cost)", {
      target: DEFAULT_FORMULA_TARGET,
    });
    expect(expr.type).toBe("rowAggregate");
  });
});
