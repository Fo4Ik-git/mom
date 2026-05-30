import type { PaletteBlock } from "@/lib/formula/blocks/block-palette-types";

const OPERATOR_DOC_IDS: Record<string, string> = {
  "+": "plus",
  "-": "minus",
  "*": "multiply",
  "/": "divide",
  ">": "gt",
  "<": "lt",
  ">=": "gte",
  "<=": "lte",
  "==": "eq",
  "!=": "neq",
};

/** Map palette block → `/docs#{id}` anchor (primitives only). */
export function paletteBlockDocId(block: PaletteBlock): string | null {
  if (block.category === "operator" && block.dragData.kind === "operator") {
    return OPERATOR_DOC_IDS[block.dragData.operator] ?? null;
  }

  if (block.category === "aggregate" && block.dragData.kind === "aggregate") {
    return block.dragData.function.toLowerCase();
  }

  if (block.category === "rowAggregate" &&
    block.dragData.kind === "rowAggregate"
  ) {
    return `${block.dragData.function.toLowerCase()}-rows`;
  }

  if (block.category === "conditional") {
    return "if";
  }

  return null;
}
