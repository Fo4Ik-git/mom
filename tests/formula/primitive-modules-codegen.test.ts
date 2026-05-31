import { describe, expect, it } from "vitest";
import {
  buildPrimitiveModulesSource,
  listPrimitiveNodeFiles,
  moduleImportAlias,
  PRIMITIVES_DIR,
} from "@/lib/formula/nodes/primitives/primitive-modules.codegen";
import { PRIMITIVE_MODULE_ENTRIES } from "@/lib/formula/nodes/primitives/primitive-modules.generated";

describe("listPrimitiveNodeFiles", () => {
  it("includes every non-template *.node.ts on disk", () => {
    const onDisk = listPrimitiveNodeFiles(PRIMITIVES_DIR);
    expect(onDisk.length).toBeGreaterThan(0);
    expect(onDisk.every((f) => f.endsWith(".node.ts"))).toBe(true);
    expect(onDisk.some((f) => f.startsWith("_template"))).toBe(false);
    expect(onDisk).toContain("comparisons.node.ts");
    expect(onDisk).toContain("plus.node.ts");
  });

  it("matches committed generated barrel entry count", () => {
    expect(listPrimitiveNodeFiles(PRIMITIVES_DIR).length).toBe(
      PRIMITIVE_MODULE_ENTRIES.length,
    );
  });
});

describe("moduleImportAlias", () => {
  it("sanitizes hyphens for valid import identifiers", () => {
    expect(moduleImportAlias("avg-rows.node.ts")).toBe("avg_rows_node");
    expect(moduleImportAlias("plus.node.ts")).toBe("plus_node");
  });
});

describe("buildPrimitiveModulesSource", () => {
  it("emits imports and entries for each file", () => {
    const files = ["plus.node.ts", "avg-rows.node.ts"];
    const source = buildPrimitiveModulesSource(files);

    expect(source).toContain('import * as plus_node from "./plus.node";');
    expect(source).toContain(
      'import * as avg_rows_node from "./avg-rows.node";',
    );
    expect(source).toContain('{ path: "./plus.node.ts", mod: plus_node }');
    expect(source).toContain(
      '{ path: "./avg-rows.node.ts", mod: avg_rows_node }',
    );
    expect(source).toContain("PRIMITIVE_MODULE_ENTRIES");
    expect(source).toContain("AUTO-GENERATED");
  });

  it("produces empty entries array when no files", () => {
    const source = buildPrimitiveModulesSource([]);
    expect(source).toMatch(
      /export const PRIMITIVE_MODULE_ENTRIES[\s\S]*= \[\s*\];/,
    );
  });
});

describe("generated barrel sync", () => {
  it("lists the same paths as on-disk node files", () => {
    const onDisk = listPrimitiveNodeFiles(PRIMITIVES_DIR).map(
      (f) => `./${f}`,
    );
    const inBarrel = PRIMITIVE_MODULE_ENTRIES.map((e) => e.path).sort();
    expect(inBarrel).toEqual([...onDisk].sort());
  });

  it("imports resolve to modules with at least one primitive", () => {
    for (const { path, mod } of PRIMITIVE_MODULE_ENTRIES) {
      const keys = Object.keys(mod);
      const hasBundle = keys.some((k) => k.endsWith("_PRIMITIVES"));
      const hasSingle = keys.some((k) => k.endsWith("Primitive"));
      expect(
        hasBundle || hasSingle,
        `${path} should export *Primitive or *_PRIMITIVES`,
      ).toBe(true);
    }
  });
});
