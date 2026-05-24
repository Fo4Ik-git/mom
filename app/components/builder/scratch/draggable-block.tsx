"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { PaletteBlock } from "@/lib/formula/block-palette";
import { BLOCK_COLORS } from "@/lib/formula/block-palette";

interface DraggableBlockProps {
  block: PaletteBlock;
  onTap?: () => void;
}

export function DraggableBlock({ block, onTap }: DraggableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette-${block.id}`,
      data: { source: "palette" as const, ...block.dragData },
    });

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`cursor-grab touch-manipulation rounded-xl border px-3 py-2 text-left text-sm font-medium shadow-sm active:cursor-grabbing ${BLOCK_COLORS[block.color]}`}
      onClick={onTap}
      {...listeners}
      {...attributes}
    >
      {block.label}
    </button>
  );
}
