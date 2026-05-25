"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import type { BlockExpression } from "@/types/calculator";
import { BLOCK_COLORS } from "@/lib/formula/block-palette";
import type { SlotPath, WorkspaceDragData } from "@/lib/formula/block-tree";
import { isExpressionFilled } from "@/lib/formula/block-tree";
import { DragHandle } from "@/app/components/builder/scratch/drag-handle";

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
  isActive?: boolean;
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
  isActive = false,
}: BlockSlotProps) {
  const t = useTranslations("builder");
  const filled = isExpressionFilled(expression);
  const workspaceDrag = draggable && filled;

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
    disabled: !workspaceDrag,
  });

  const setNodeRef = (node: HTMLElement | null) => {
    setDropRef(node);
  };

  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.45 : 1,
      }}
      className={`relative flex shrink-0 items-stretch gap-0.5 select-none rounded-xl border-2 transition ${
        compact ? "min-h-[40px]" : "min-h-[52px] min-w-[88px] flex-1"
      } ${
        isOver
          ? "border-accent bg-accent/20 ring-2 ring-accent/30"
          : isActive && !filled
            ? "border-accent bg-accent/15 ring-2 ring-accent/40"
            : filled
              ? BLOCK_COLORS[color]
              : BLOCK_COLORS.empty
      }`}
    >
      {workspaceDrag && (
        <DragHandle
          setNodeRef={setDragRef}
          listeners={listeners}
          attributes={attributes}
          label={t("dragHandle")}
          compact={compact}
        />
      )}
      <button
        type="button"
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          onTap?.();
        }}
        className={`flex min-h-[44px] flex-1 touch-manipulation items-center text-left ${
          compact ? "gap-0 px-2 py-1.5" : "flex-col items-start justify-center px-3 py-2"
        }`}
      >
        {!compact && label && (
          <span className="text-[10px] uppercase tracking-wide opacity-70">
            {label}
          </span>
        )}
        <span
          className={`font-semibold leading-tight select-none ${compact ? "text-sm whitespace-nowrap" : "text-sm"}`}
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
          className="absolute -right-1.5 -top-1.5 z-10 flex size-5 min-h-[28px] min-w-[28px] touch-manipulation items-center justify-center rounded-full bg-destructive text-[10px] text-white shadow-sm"
          aria-label="Remove block"
        >
          ×
        </button>
      )}
    </div>
  );
}
