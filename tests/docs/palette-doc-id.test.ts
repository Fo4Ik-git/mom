import { describe, expect, it } from "vitest";
import { paletteBlockDocId } from "@/lib/formula/docs/palette-doc-id";

describe("paletteBlockDocId", () => {
  it("maps operators to primitive doc ids", () => {
    expect(
      paletteBlockDocId({
        id: "op-+",
        label: "+",
        category: "operator",
        color: "operator",
        dragData: { kind: "operator", operator: "+" },
      }),
    ).toBe("plus");
  });

  it("maps aggregates and row aggregates", () => {
    expect(
      paletteBlockDocId({
        id: "agg-SUM",
        label: "SUM",
        category: "aggregate",
        color: "aggregate",
        dragData: { kind: "aggregate", function: "SUM" },
      }),
    ).toBe("sum");

    expect(
      paletteBlockDocId({
        id: "ra-SUM",
        label: "SUM rows",
        category: "rowAggregate",
        color: "rowAggregate",
        dragData: { kind: "rowAggregate", fieldId: "field_lines", function: "SUM" },
      }),
    ).toBe("sum-rows");
  });
});
