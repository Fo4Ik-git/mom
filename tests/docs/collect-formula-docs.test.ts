import { describe, expect, it } from "vitest";
import { getAllConfigEntities } from "@/lib/calculator/schema/registry";
import {
  collectFormulaDocs,
  getFormulaDocPrimitiveIds,
} from "@/lib/formula/docs/collect-formula-docs";
import { getAllFormulaPrimitives } from "@/lib/formula/nodes/registry";

describe("collectFormulaDocs", () => {
  const data = collectFormulaDocs();

  it("includes every registered primitive", () => {
    const registryIds = getAllFormulaPrimitives()
      .map((p) => p.id)
      .sort();
    const docIds = getFormulaDocPrimitiveIds().sort();
    expect(docIds).toEqual(registryIds);
  });

  it("assigns valid categories and non-empty syntax", () => {
    const validCategories = new Set([
      "operators",
      "aggregates",
      "rowAggregates",
      "operands",
      "script",
    ]);
    for (const entry of data.primitives) {
      expect(validCategories.has(entry.category)).toBe(true);
      expect(entry.syntax.trim().length).toBeGreaterThan(0);
    }
  });

  it("provides examples for all primitives", () => {
    for (const entry of data.primitives) {
      expect(entry.example.trim().length).toBeGreaterThan(0);
    }
  });

  it("includes operand reference docs", () => {
    expect(data.operands.length).toBeGreaterThanOrEqual(5);
    expect(data.operands.some((entry) => entry.id === "quantity")).toBe(true);
    expect(data.operands.some((entry) => entry.id === "row-property")).toBe(
      true,
    );
  });

  it("includes script entity docs from schema registry", () => {
    const keywords = getAllConfigEntities().map((entity) => entity.keyword);
    const docKeywords = data.script.map((entry) => entry.id);
    expect(docKeywords.sort()).toEqual(keywords.sort());
    for (const entry of data.script) {
      expect(entry.example.trim().length).toBeGreaterThan(0);
    }
  });
});
