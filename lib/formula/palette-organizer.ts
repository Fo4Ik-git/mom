import type { InputField } from "@/types/calculator";
import type { PaletteBlock } from "@/lib/formula/block-palette";

export type PaletteTab = "snippets" | "blocks" | "actions";

export function groupOperandBlocksByInput(
  blocks: PaletteBlock[],
  inputs: InputField[],
): Array<{ id: string; label: string; items: PaletteBlock[] }> {
  const byField = new Map<string, PaletteBlock[]>();

  for (const block of blocks) {
    if (block.color === "quantity") {
      const fieldId = block.id.replace(/^q-/, "");
      if (!byField.has(fieldId)) {
        byField.set(fieldId, []);
      }
      byField.get(fieldId)!.unshift(block);
      continue;
    }
    if (block.color === "property") {
      const match = block.id.match(/^p-(.+)-(.+)$/);
      if (match) {
        const [, fieldId] = match;
        if (!byField.has(fieldId)) {
          byField.set(fieldId, []);
        }
        byField.get(fieldId)!.push(block);
      }
    }
  }

  return inputs
    .map((input) => ({
      id: input.id,
      label: input.label.trim() || input.id,
      items: byField.get(input.id) ?? [],
    }))
    .filter((group) => group.items.length > 0);
}

export function groupSnippetsByField(
  snippets: PaletteBlock[],
): Array<{ id: string; label: string; items: PaletteBlock[] }> {
  const map = new Map<string, { label: string; items: PaletteBlock[] }>();

  for (const snippet of snippets) {
    const groupId = snippet.meta?.groupId ?? "_other";
    const groupLabel = snippet.meta?.groupLabel ?? "…";
    if (!map.has(groupId)) {
      map.set(groupId, { label: groupLabel, items: [] });
    }
    map.get(groupId)!.items.push(snippet);
  }

  return [...map.entries()].map(([id, group]) => ({
    id,
    label: group.label,
    items: group.items,
  }));
}

export function filterPaletteBlocks(
  blocks: PaletteBlock[],
  query: string,
): PaletteBlock[] {
  const q = query.trim().toLowerCase();
  if (!q) {
    return blocks;
  }
  return blocks.filter((block) => {
    const haystack = [
      block.label,
      block.meta?.title,
      block.meta?.hint,
      block.meta?.groupLabel,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

export function filterGroupedBlocks(
  groups: Array<{ id: string; label: string; items: PaletteBlock[] }>,
  query: string,
): Array<{ id: string; label: string; items: PaletteBlock[] }> {
  const q = query.trim().toLowerCase();
  if (!q) {
    return groups;
  }
  return groups
    .map((group) => ({
      ...group,
      items: filterPaletteBlocks(group.items, q),
    }))
    .filter(
      (group) =>
        group.items.length > 0 || group.label.toLowerCase().includes(q),
    );
}

export function countPaletteItems(
  groups: Array<{ items: PaletteBlock[] }>,
  loose: PaletteBlock[] = [],
): number {
  return (
    loose.length + groups.reduce((sum, group) => sum + group.items.length, 0)
  );
}