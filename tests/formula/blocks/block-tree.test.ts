import { describe, expect, it } from "vitest";
import { emptyBlockExpression } from "@/types/calculator";
import {
  applyAfterExpression,
  applyPaletteToSlot,
  getSlotExpression,
  isContinuePath,
  isExpressionFilled,
  setSlotExpression,
  showContinuationAfter,
  showContinuationAfterLeft,
} from "@/lib/formula/blocks/block-tree";
import { slotPathsEqual } from "@/lib/formula/blocks/slot-path";

describe("block tree (builder scratch editor)", () => {
  const numberOperand = {
    source: "palette" as const,
    kind: "number" as const,
    value: 5,
  };

  const propertyOperand = {
    source: "palette" as const,
    kind: "operand" as const,
    operand: {
      kind: "property" as const,
      fieldId: "field_item",
      propertyId: "var_price",
    },
  };

  it("isExpressionFilled detects empty vs filled nodes", () => {
    expect(isExpressionFilled(emptyBlockExpression())).toBe(false);
    expect(isExpressionFilled({ type: "operand", operand: { kind: "number", value: 1 } })).toBe(
      true,
    );
  });

  it("setSlotExpression and getSlotExpression round-trip", () => {
    let root = emptyBlockExpression();
    root = setSlotExpression(root, [], {
      type: "operand",
      operand: { kind: "number", value: 10 },
    });
    expect(getSlotExpression(root, []).type).toBe("operand");
    root = setSlotExpression(root, ["right"], {
      type: "operand",
      operand: { kind: "number", value: 20 },
    });
    expect(getSlotExpression(root, ["right"]).type).toBe("operand");
  });

  it("applyPaletteToSlot inserts operand into empty slot", () => {
    const root = applyPaletteToSlot(emptyBlockExpression(), [], propertyOperand);
    expect(root.type).toBe("operand");
  });

  it("applyAfterExpression chains operator after filled expression", () => {
    const filled = {
      type: "operand" as const,
      operand: { kind: "number" as const, value: 1 },
    };
    const next = applyAfterExpression(filled, {
      source: "palette",
      kind: "operator",
      operator: "+",
    });
    expect(next.type).toBe("operation");
    if (next.type === "operation") {
      expect(next.operator).toBe("+");
      expect(next.left).toEqual(filled);
    }
  });

  it("showContinuationAfterLeft when right side empty", () => {
    const op = {
      type: "operation" as const,
      operator: "+" as const,
      left: { type: "operand" as const, operand: { kind: "number" as const, value: 1 } },
      right: emptyBlockExpression(),
    };
    expect(showContinuationAfterLeft(op)).toBe(true);
    expect(showContinuationAfter(op)).toBe(false);
  });

  it("showContinuationAfter true for filled operand", () => {
    expect(
      showContinuationAfter({
        type: "operand",
        operand: { kind: "number", value: 3 },
      }),
    ).toBe(true);
  });

  it("isContinuePath and slotPathsEqual", () => {
    expect(isContinuePath(["left", "continue"])).toBe(true);
    expect(slotPathsEqual(["left"], ["left"])).toBe(true);
    expect(slotPathsEqual(["left"], ["right"])).toBe(false);
  });

  it("applyPaletteToSlot inserts number literal", () => {
    const root = applyPaletteToSlot(emptyBlockExpression(), [], numberOperand);
    expect(root.type).toBe("operand");
    if (root.type === "operand" && root.operand.kind === "number") {
      expect(root.operand.value).toBe(5);
    }
  });
});
