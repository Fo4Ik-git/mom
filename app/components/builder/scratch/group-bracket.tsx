"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { SlotPath } from "@/lib/formula/block-tree";

interface GroupBracketProps {
  outputKey: string;
  path: SlotPath[];
  children: React.ReactNode;
  onRemove: () => void;
}

export function GroupBracket({
  outputKey,
  path,
  children,
  onRemove,
}: GroupBracketProps) {
  const pathKey = path.join("-") || "root";
  const dropId = `${outputKey}-group-drop-${pathKey}`;
  const dragId = `${outputKey}-group-drag-${pathKey}`;

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: dropId,
    data: { path, target: "group" as const },
  });

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: dragId,
    data: {
      source: "workspace" as const,
      kind: "group" as const,
      path,
    },
  });

  return (
    <div
      ref={setDropRef}
      className={`relative inline-flex max-w-full items-center gap-1.5 rounded-xl border-2 px-2 py-1.5 transition ${
        isOver
          ? "border-accent bg-accent/15 ring-2 ring-accent/30"
          : "border-violet-400/50 bg-violet-500/10"
      }`}
    >
      <button
        type="button"
        ref={setDragRef}
        style={{
          transform: CSS.Translate.toString(transform),
          opacity: isDragging ? 0.45 : 1,
        }}
        className="cursor-grab touch-manipulation rounded px-0.5 text-lg font-bold leading-none text-violet-700 active:cursor-grabbing dark:text-violet-300"
        aria-label="Drag group"
        {...listeners}
        {...attributes}
      >
        (
      </button>
      <div className="flex min-w-[40px] flex-wrap items-center gap-2">{children}</div>
      <span className="text-lg font-bold leading-none text-violet-700 dark:text-violet-300">
        )
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] text-white shadow-sm"
        aria-label="Remove brackets"
      >
        ×
      </button>
    </div>
  );
}
