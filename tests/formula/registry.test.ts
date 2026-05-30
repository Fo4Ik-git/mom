import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import {
  ALL_PRIMITIVES,
  getAllFormulaNodes,
  getAllFormulaPrimitives,
  getInfixPrecedence,
  getRegisteredInfixSymbols,
  mergeNodeCompletions,
  mergePaletteItems,
  parseCodeCallViaRegistry,
} from "@/lib/formula/nodes/registry";
import { generateDefaultCompletions } from "@/lib/formula/nodes/generate-completions";

describe("formula registry", () => {
  it("registers all primitives with unique ids", () => {
    const ids = getAllFormulaPrimitives().map((p) => p.id);
    expect(ids.length).toBe(ALL_PRIMITIVES.length);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("each primitive has evaluate and either infix or call", () => {
    for (const primitive of getAllFormulaPrimitives()) {
      expect(typeof primitive.evaluate).toBe("function");
      expect(primitive.infix || primitive.call).toBeTruthy();
    }
  });

  it("exposes infix symbols with precedence", () => {
    const symbols = getRegisteredInfixSymbols();
    expect(symbols).toContain("+");
    expect(symbols).toContain(">");
    expect(symbols).toContain("==");
    expect(getInfixPrecedence("+")).toBe(1);
    expect(getInfixPrecedence("*")).toBe(2);
    expect(getInfixPrecedence(">")).toBe(0);
    expect(getInfixPrecedence("?")).toBeNull();
  });

  it("mergePaletteItems returns blocks for default config", () => {
    const items = mergePaletteItems({
      config: emptyCalculatorConfig,
      target: { fieldId: "output_total" },
      quantityLabel: "Qty",
      rowsLabel: "Rows",
    });
    expect(items.length).toBeGreaterThan(10);
    expect(items.some((item) => item.category === "operator")).toBe(true);
    expect(items.some((item) => item.category === "aggregate")).toBe(true);
  });

  it("mergeNodeCompletions includes aggregate keywords", () => {
    const completions = mergeNodeCompletions(emptyCalculatorConfig, {
      fieldId: "output_total",
    });
    const labels = completions.map((item) => item.label);
    expect(labels).toContain("SUM");
    expect(labels).toContain("COUNT");
    expect(labels).toContain("AVG_ROWS");
    expect(labels).toContain("IF");
  });

  it("auto-generates completions for primitives without explicit completions", () => {
    for (const primitive of getAllFormulaPrimitives()) {
      if (primitive.infix || primitive.completions) {
        continue;
      }
      if (!primitive.call?.keyword) {
        continue;
      }
      const generated = generateDefaultCompletions(primitive);
      expect(generated.length).toBeGreaterThan(0);
      expect(generated[0]?.label).toBe(primitive.call.keyword);
    }
  });

  it("parseCodeCallViaRegistry returns null for unknown keyword", () => {
    const result = parseCodeCallViaRegistry("UNKNOWN_FN", {
      target: { fieldId: "output_total" },
      identStart: 0,
      identEnd: 10,
      peekIsLParen: () => false,
      expectLParen: () => {},
      expectRParen: () => {},
      expectIdent: () => ({ value: "", start: 0 }),
      expectComma: () => {},
      parseExpression: () => ({ type: "empty" }),
      parseExpressionWithRowField: () => ({ type: "empty" }),
      parseArgumentList: () => [],
      fail: () => {
        throw new Error("fail");
      },
    });
    expect(result).toBeNull();
  });

  it("registers structural nodes", () => {
    const types = getAllFormulaNodes().map((node) => node.type);
    expect(types).toContain("operand");
    expect(types).toContain("group");
    expect(types).toContain("empty");
  });
});
