import { describe, expect, it } from "vitest";
import {
  buildAllPrimitivesFromModuleEntries,
  collectFromModule,
  isPrimitiveDefinition,
  sortPrimitives,
} from "@/lib/formula/nodes/primitives/collect-primitives.logic";
import { mockPrimitive } from "@/tests/formula/helpers/mock-primitive";

describe("isPrimitiveDefinition", () => {
  it.each([
    [null, false],
    [undefined, false],
    [42, false],
    ["x", false],
    [{}, false],
    [{ id: "x" }, false],
    [{ id: "x", evaluate: () => 0 }, false],
    [{ id: "x", matchNode: () => false }, false],
  ])("rejects %o", (value, expected) => {
    expect(isPrimitiveDefinition(value)).toBe(expected);
  });

  it("accepts minimal valid primitive", () => {
    expect(isPrimitiveDefinition(mockPrimitive({ id: "a" }))).toBe(true);
  });
});

describe("collectFromModule", () => {
  it("returns empty array for module with no primitives", () => {
    expect(collectFromModule({ helper: () => 1, INFIX_PRECEDENCE: 2 })).toEqual(
      [],
    );
  });

  it("collects exports ending with Primitive", () => {
    const a = mockPrimitive({ id: "a" });
    const b = mockPrimitive({ id: "b" });
    expect(
      collectFromModule({
        alphaPrimitive: a,
        betaPrimitive: b,
        notIncluded: { id: "x" },
      }).map((p) => p.id),
    ).toEqual(expect.arrayContaining(["a", "b"]));
  });

  it("skips *Primitive exports that fail validation", () => {
    const valid = mockPrimitive({ id: "ok" });
    expect(
      collectFromModule({
        goodPrimitive: valid,
        badPrimitive: { id: "bad" },
      }).map((p) => p.id),
    ).toEqual(["ok"]);
  });

  it("prefers *_PRIMITIVES bundle over *Primitive singles", () => {
    const bundled = mockPrimitive({ id: "from-bundle" });
    const single = mockPrimitive({ id: "from-single" });
    expect(
      collectFromModule({
        lonePrimitive: single,
        MY_PRIMITIVES: [bundled],
      }).map((p) => p.id),
    ).toEqual(["from-bundle"]);
  });

  it("uses *_PRIMITIVES when every element is valid", () => {
    const items = [
      mockPrimitive({ id: "gt" }),
      mockPrimitive({ id: "lt" }),
    ];
    expect(
      collectFromModule({ COMPARISON_PRIMITIVES: items }).map((p) => p.id),
    ).toEqual(["gt", "lt"]);
  });

  it("falls back to *Primitive when *_PRIMITIVES array is invalid", () => {
    const single = mockPrimitive({ id: "fallback" });
    expect(
      collectFromModule({
        BROKEN_PRIMITIVES: [{ id: "no-eval" }],
        fallbackPrimitive: single,
      }).map((p) => p.id),
    ).toEqual(["fallback"]);
  });

  it("uses empty *_PRIMITIVES bundle without falling back to *Primitive", () => {
    const single = mockPrimitive({ id: "only-single" });
    expect(
      collectFromModule({
        EMPTY_PRIMITIVES: [],
        onlySinglePrimitive: single,
      }),
    ).toEqual([]);
  });

  it("ignores *_PRIMITIVES key when value is not an array", () => {
    const single = mockPrimitive({ id: "x" });
    expect(
      collectFromModule({
        WEIRD_PRIMITIVES: "nope",
        xPrimitive: single,
      }).map((p) => p.id),
    ).toEqual(["x"]);
  });
});

describe("sortPrimitives", () => {
  it("orders higher infix precedence before lower", () => {
    const mul = mockPrimitive({
      id: "mul",
      infix: { symbol: "*", precedence: 20 },
    });
    const plus = mockPrimitive({
      id: "plus",
      infix: { symbol: "+", precedence: 10 },
    });
    expect(sortPrimitives([plus, mul]).map((p) => p.id)).toEqual(["mul", "plus"]);
  });

  it("treats missing infix precedence as -1 when comparing", () => {
    const call = mockPrimitive({ id: "sum", call: { keyword: "SUM" } });
    const plus = mockPrimitive({
      id: "plus",
      infix: { symbol: "+", precedence: 0 },
    });
    expect(sortPrimitives([call, plus]).map((p) => p.id)).toEqual([
      "plus",
      "sum",
    ]);
  });

  it("sorts same precedence by call keyword, infix symbol, then id", () => {
    const z = mockPrimitive({ id: "z-id", call: { keyword: "ZZZ" } });
    const a = mockPrimitive({ id: "a-id", call: { keyword: "AAA" } });
    expect(sortPrimitives([z, a]).map((p) => p.id)).toEqual(["a-id", "z-id"]);
  });

  it("sorts same infix precedence by symbol localeCompare", () => {
    const div = mockPrimitive({
      id: "div",
      infix: { symbol: "/", precedence: 5 },
    });
    const mul = mockPrimitive({
      id: "mul",
      infix: { symbol: "*", precedence: 5 },
    });
    expect(sortPrimitives([div, mul]).map((p) => p.infix?.symbol)).toEqual([
      "*",
      "/",
    ]);
  });
});

describe("buildAllPrimitivesFromModuleEntries", () => {
  it("returns empty list for no entries", () => {
    expect(buildAllPrimitivesFromModuleEntries([])).toEqual([]);
  });

  it("merges primitives from multiple modules", () => {
    const result = buildAllPrimitivesFromModuleEntries([
      {
        path: "./a.node.ts",
        mod: { aPrimitive: mockPrimitive({ id: "a" }) },
      },
      {
        path: "./b.node.ts",
        mod: { BUNDLE_PRIMITIVES: [mockPrimitive({ id: "b" })] },
      },
    ]);
    expect(result.map((p) => p.id).sort()).toEqual(["a", "b"]);
  });

  it("throws on duplicate id with source path", () => {
    const dup = mockPrimitive({ id: "dup" });
    expect(() =>
      buildAllPrimitivesFromModuleEntries([
        { path: "./first.node.ts", mod: { xPrimitive: dup } },
        { path: "./second.node.ts", mod: { yPrimitive: dup } },
      ]),
    ).toThrow('Duplicate formula primitive id "dup" in ./second.node.ts');
  });

  it("applies sort order to merged result", () => {
    const low = mockPrimitive({
      id: "low",
      infix: { symbol: "+", precedence: 1 },
    });
    const high = mockPrimitive({
      id: "high",
      infix: { symbol: "*", precedence: 9 },
    });
    const result = buildAllPrimitivesFromModuleEntries([
      { path: "./x.node.ts", mod: { lowPrimitive: low, highPrimitive: high } },
    ]);
    expect(result.map((p) => p.id)).toEqual(["high", "low"]);
  });
});
