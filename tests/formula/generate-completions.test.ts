import { describe, expect, it } from "vitest";
import { generateDefaultCompletions } from "@/lib/formula/nodes/generate-completions";
import { ifPrimitive } from "@/lib/formula/nodes/primitives/if.node";
import { sumPrimitive } from "@/lib/formula/nodes/primitives/sum.node";
import { sumRowsPrimitive } from "@/lib/formula/nodes/primitives/sum-rows.node";
import { plusPrimitive } from "@/lib/formula/nodes/primitives/plus.node";

describe("generateDefaultCompletions", () => {
  it("generates aggregate snippet from call keyword", () => {
    const [item] = generateDefaultCompletions(sumPrimitive);
    expect(item).toEqual({
      label: "SUM",
      type: "keyword",
      insertText: "SUM($0)",
      detail: "SUM",
    });
  });

  it("generates row aggregate snippet", () => {
    const [item] = generateDefaultCompletions(sumRowsPrimitive);
    expect(item?.label).toBe("SUM_ROWS");
    expect(item?.insertText).toBe("SUM_ROWS(field_id, $0)");
  });

  it("generates conditional snippet", () => {
    const [item] = generateDefaultCompletions(ifPrimitive);
    expect(item?.label).toBe("IF");
    expect(item?.insertText).toBe("IF($0, , )");
  });

  it("skips infix operators", () => {
    expect(generateDefaultCompletions(plusPrimitive)).toEqual([]);
  });
});
