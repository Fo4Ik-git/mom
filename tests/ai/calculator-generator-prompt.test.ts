import { describe, expect, it } from "vitest";
import { CALCULATOR_AUTO_TOTAL_REFERENCE_FOR_AI } from "@/lib/ai/calculator-generator-reference-content";
import {
  buildFormulaCatalogForAi,
  getRegisteredPrimitiveIds,
} from "@/lib/formula/docs/formula-catalog";
import { getAllFormulaPrimitives } from "@/lib/formula/nodes/registry";

describe("formula catalog for AI", () => {
  it("lists every registered primitive", () => {
    const catalog = buildFormulaCatalogForAi();
    const ids = getRegisteredPrimitiveIds();
    expect(ids.length).toBe(getAllFormulaPrimitives().length);
    for (const id of ids) {
      expect(catalog).toContain(`id: ${id}`);
    }
  });

  it("includes core functions and auto_total", () => {
    const catalog = buildFormulaCatalogForAi();
    expect(catalog).toContain("SUM(");
    expect(catalog).toContain("IF(");
    expect(catalog).toContain("ROUND(");
    expect(catalog).toContain("SUM_ROWS");
    expect(catalog).toContain("auto_total");
    expect(catalog).toContain("input");
    expect(catalog).toContain("macro");
  });

  it("auto-total reference mentions calc_field pattern", () => {
    expect(CALCULATOR_AUTO_TOTAL_REFERENCE_FOR_AI).toContain("calc_{field_id}_{property_id}");
  });
});
