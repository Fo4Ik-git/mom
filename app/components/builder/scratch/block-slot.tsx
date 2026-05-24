"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import type { BlockExpression } from "@/types/calculator";
import { BLOCK_COLORS } from "@/lib/formula/block-palette";
import type { SlotPath, WorkspaceDragData } from "@/lib/formula/block-tree";
import { isExpressionFilled } from "@/lib/formula/block-tree";

interface BlockSlotProps {
  slotId: string;
  path: SlotPath[];
  expression: BlockExpression;
  label?: string;
  filledLabel?: string;
  color?: keyof typeof BLOCK_COLORS;
  compact?: boolean;
  draggable?: boolean;
  onClear?: () => void;
  onTap?: () => void;
}

export function BlockSlot({
  slotId,
  path,
  expression,
  label,
  filledLabel,
  color = "empty",
  compact = false,
  draggable = false,
  onClear,
  onTap,
}: BlockSlotProps) {
  const filled = isExpressionFilled(expression);

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: slotId,
    data: { path, target: "slot" as const },
  });

  const dragKind =
    expression.type === "group" ? ("group" as const) : ("slot" as const);

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `workspace-${slotId}`,
    data: {
      source: "workspace",
      kind: dragKind,
      path,
    } satisfies WorkspaceDragData,
    disabled: !draggable || !filled,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDropRef(node);
    if (draggable && filled) {
      setDragRef(node);
    }
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.45 : 1,
      }}
      className={`relative shrink-0 rounded-xl border-2 transition ${
        compact
          ? "min-h-[40px] px-2.5 py-1.5"
          : "min-h-[52px] min-w-[88px] flex-1 px-3 py-2"
      } ${
        draggable && filled ? "cursor-grab touch-manipulation active:cursor-grabbing" : ""
      } ${
        isOver
          ? "border-accent bg-accent/20 ring-2 ring-accent/30"
          : filled
            ? BLOCK_COLORS[color]
            : BLOCK_COLORS.empty
      }`}
      {...(draggable && filled ? { ...listeners, ...attributes } : {})}
    >
      <button
        type="button"
        onClick={onTap}
        className={`flex h-full w-full items-center text-left ${compact ? "gap-0" : "flex-col items-start justify-center"}`}
      >
        {!compact && label && (
          <span className="text-[10px] uppercase tracking-wide opacity-70">
            {label}
          </span>
        )}
        <span
          className={`font-semibold leading-tight ${compact ? "text-sm whitespace-nowrap" : "text-sm"}`}
        >
          {filled ? filledLabel : "＋"}
        </span>
      </button>
      {filled && onClear && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onClear();
          }}
          className="absolute -right-1.5 -top-1.5 flex size-5 items-center justify-center rounded-full bg-destructive text-[10px] text-white shadow-sm"
          aria-label="Remove block"
        >
          ×
        </button>
      )}
    </div>
  );
}
