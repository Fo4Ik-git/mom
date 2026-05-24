import type { SlotPath } from "@/lib/formula/block-tree";

export function slotPathsEqual(a: SlotPath[] | null | undefined, b: SlotPath[]): boolean {
  if (!a || a.length !== b.length) {
    return false;
  }
  return a.every((segment, index) => segment === b[index]);
}
