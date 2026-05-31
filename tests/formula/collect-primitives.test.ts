import { describe, expect, it } from "vitest";
import { collectAllPrimitives } from "@/lib/formula/nodes/primitives/collect-primitives";
import { buildAllPrimitivesFromModuleEntries } from "@/lib/formula/nodes/primitives/collect-primitives.logic";
import { ALL_PRIMITIVES, getAllPrimitives } from "@/lib/formula/nodes/primitives";
import { PRIMITIVE_MODULE_ENTRIES } from "@/lib/formula/nodes/primitives/primitive-modules.generated";
import { getAllFormulaPrimitives } from "@/lib/formula/nodes/registry";

describe("collectAllPrimitives (integration)", () => {
  it("matches ALL_PRIMITIVES export", () => {
    expect(collectAllPrimitives().map((p) => p.id).sort()).toEqual(
      ALL_PRIMITIVES.map((p) => p.id).sort(),
    );
  });

  it("getAllPrimitives returns the same array reference as ALL_PRIMITIVES", () => {
    expect(getAllPrimitives()).toBe(ALL_PRIMITIVES);
  });

  it("matches registry getAllFormulaPrimitives", () => {
    expect(collectAllPrimitives().map((p) => p.id).sort()).toEqual(
      getAllFormulaPrimitives()
        .map((p) => p.id)
        .sort(),
    );
  });

  it("equals build from generated barrel entries", () => {
    expect(collectAllPrimitives().map((p) => p.id).sort()).toEqual(
      buildAllPrimitivesFromModuleEntries(PRIMITIVE_MODULE_ENTRIES)
        .map((p) => p.id)
        .sort(),
    );
  });

  it("excludes template file and includes core operators", () => {
    const ids = collectAllPrimitives().map((p) => p.id);
    expect(ids).not.toContain("my-fn");
    expect(ids).toContain("plus");
    expect(ids).toContain("sum");
    expect(ids).toContain("if");
    expect(ids).toContain("round");
    expect(ids).toContain("gt");
    expect(ids).toContain("sum-rows");
  });

  it("includes all comparison primitives from bundle module", () => {
    const ids = collectAllPrimitives().map((p) => p.id);
    for (const id of ["gt", "lt", "gte", "lte", "eq", "neq"]) {
      expect(ids, `missing comparison ${id}`).toContain(id);
    }
  });

  it("has unique ids", () => {
    const ids = collectAllPrimitives().map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("every primitive has required registry fields", () => {
    for (const p of collectAllPrimitives()) {
      expect(p.id).toMatch(/^[a-z0-9-]+$/);
      expect(typeof p.astType).toBe("string");
      expect(typeof p.matchNode).toBe("function");
      expect(typeof p.evaluate).toBe("function");
    }
  });

  it("sorted: infix operators with higher precedence appear earlier", () => {
    const items = collectAllPrimitives();
    const mulIdx = items.findIndex((p) => p.id === "multiply");
    const plusIdx = items.findIndex((p) => p.id === "plus");
    expect(mulIdx).toBeGreaterThanOrEqual(0);
    expect(plusIdx).toBeGreaterThanOrEqual(0);
    expect(mulIdx).toBeLessThan(plusIdx);
  });
});
