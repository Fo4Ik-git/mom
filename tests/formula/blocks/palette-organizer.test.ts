import { describe, expect, it } from "vitest";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { mergePaletteItems } from "@/lib/formula/nodes/registry";
import {
  countPaletteItems,
  filterGroupedBlocks,
  filterPaletteBlocks,
  groupOperandBlocksByInput,
  groupSnippetsByField,
} from "@/lib/formula/blocks/palette-organizer";

describe("palette organizer (builder)", () => {
  const blocks = mergePaletteItems({
    config: emptyCalculatorConfig,
    target: { fieldId: "output_total" },
    quantityLabel: "Qty",
    rowsLabel: "Rows",
  });

  it("groupOperandBlocksByInput groups quantity and property blocks", () => {
    const groups = groupOperandBlocksByInput(blocks, emptyCalculatorConfig.inputs);
    expect(groups.length).toBeGreaterThan(0);
    expect(groups[0]?.items.length).toBeGreaterThan(0);
  });

  it("filterPaletteBlocks searches label and meta", () => {
    const filtered = filterPaletteBlocks(blocks, "sum");
    expect(filtered.length).toBeGreaterThan(0);
    expect(filterPaletteBlocks(blocks, "")).toHaveLength(blocks.length);
  });

  it("filterGroupedBlocks keeps groups matching label", () => {
    const groups = groupOperandBlocksByInput(blocks, emptyCalculatorConfig.inputs);
    const filtered = filterGroupedBlocks(groups, "позиція");
    expect(filtered.some((g) => g.items.length > 0 || g.label.length > 0)).toBe(
      true,
    );
  });

  it("groupSnippetsByField groups by meta groupId", () => {
    const snippets = blocks.filter((b) => b.category === "snippet");
    if (snippets.length === 0) {
      return;
    }
    const grouped = groupSnippetsByField(snippets);
    expect(grouped.length).toBeGreaterThan(0);
  });

  it("countPaletteItems sums loose and grouped items", () => {
    const groups = [{ items: blocks.slice(0, 3) }];
    expect(countPaletteItems(groups, blocks.slice(3, 5))).toBe(5);
  });
});
