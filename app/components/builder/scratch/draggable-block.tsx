"use client";

import { useDraggable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { PaletteBlock } from "@/lib/formula/block-palette";
import { BLOCK_COLORS } from "@/lib/formula/block-palette";

interface DraggableBlockProps {
  block: PaletteBlock;
  onTap?: () => void;
  centered?: boolean;
}

export function DraggableBlock({ block, onTap, centered = false }: DraggableBlockProps) {
  const { attributes, listeners, setNodeRef, transform, isDragging } =
    useDraggable({
      id: `palette-${block.id}`,
      data: { source: "palette" as const, ...block.dragData },
    });

  const hint = block.meta?.hint;

  return (
    <button
      ref={setNodeRef}
      type="button"
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.4 : 1,
      }}
      className={`cursor-grab touch-manipulation rounded-xl border px-3 py-2 shadow-sm active:cursor-grabbing ${BLOCK_COLORS[block.color]} ${
        centered
          ? "flex min-h-[44px] w-full flex-col items-center justify-center text-center text-sm font-medium"
          : "text-left text-sm font-medium"
      }`}
      onClick={onTap}
      {...listeners}
      {...attributes}
    >
      <span className="block truncate">{block.label}</span>
      {centered && hint && (
        <span className="mt-0.5 block truncate text-[10px] font-normal opacity-75">
          {hint}
        </span>
      )}
    </button>
  );
}
