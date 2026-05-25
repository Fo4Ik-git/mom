"use client";

import type { DraggableAttributes } from "@dnd-kit/core";
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities";

interface DragHandleProps {
  setNodeRef?: (node: HTMLElement | null) => void;
  listeners?: SyntheticListenerMap;
  attributes?: DraggableAttributes;
  label: string;
  compact?: boolean;
}

export function DragHandle({
  setNodeRef,
  listeners,
  attributes,
  label,
  compact = false,
}: DragHandleProps) {
  return (
    <button
      type="button"
      ref={setNodeRef}
      aria-label={label}
      className={`shrink-0 cursor-grab select-none touch-none rounded-md text-muted-foreground hover:bg-muted/80 active:cursor-grabbing ${
        compact
          ? "flex size-8 min-h-[32px] min-w-[32px] items-center justify-center text-sm"
          : "flex size-9 min-h-[36px] min-w-[36px] items-center justify-center text-base"
      }`}
      style={{ touchAction: "none" }}
      {...listeners}
      {...attributes}
    >
      ⠿
    </button>
  );
}
