"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import type { SlotPath } from "@/lib/formula/blocks/block-tree";
import { DragHandle } from "@/app/components/builder/scratch/drag-handle";

interface ConditionalBracketProps {
  outputKey: string;
  path: SlotPath[];
  children: React.ReactNode;
  onRemove: () => void;
}

export function ConditionalBracket({
  outputKey,
  path,
  children,
  onRemove,
}: ConditionalBracketProps) {
  const t = useTranslations("builder");
  const pathKey = path.join("-") || "root";
  const dropId = `${outputKey}-if-drop-${pathKey}`;
  const dragId = `${outputKey}-if-drag-${pathKey}`;

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: dropId,
    data: { path, target: "conditional" as const },
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
      kind: "conditional" as const,
      path,
    },
  });

  return (
    <div
      ref={setDropRef}
      style={{
        transform: CSS.Translate.toString(transform),
        opacity: isDragging ? 0.45 : 1,
      }}
      className={`relative inline-flex max-w-full select-none flex-wrap items-center gap-1 rounded-xl border-2 px-1.5 py-1.5 transition ${
        isOver
          ? "border-accent bg-accent/15 ring-2 ring-accent/30"
          : "border-rose-400/50 bg-rose-500/10"
      }`}
    >
      <DragHandle
        setNodeRef={setDragRef}
        listeners={listeners}
        attributes={attributes}
        label={t("dragHandleConditional")}
        compact
      />
      <span className="select-none text-sm font-bold uppercase tracking-wide text-rose-800 dark:text-rose-200">
        IF
      </span>
      <span className="select-none text-lg font-bold leading-none text-rose-700 dark:text-rose-300">
        (
      </span>
      <div className="flex min-w-[40px] flex-wrap items-center gap-1.5">{children}</div>
      <span className="select-none text-lg font-bold leading-none text-rose-700 dark:text-rose-300">
        )
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 z-10 flex size-5 min-h-[28px] min-w-[28px] touch-manipulation items-center justify-center rounded-full bg-destructive text-[10px] text-white shadow-sm"
        aria-label={t("removeConditional")}
      >
        ×
      </button>
    </div>
  );
}
