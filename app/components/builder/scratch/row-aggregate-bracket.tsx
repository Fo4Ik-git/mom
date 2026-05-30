"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import type { AggregateFunction } from "@/types/calculator";
import type { SlotPath } from "@/lib/formula/blocks/block-tree";
import { DragHandle } from "@/app/components/builder/scratch/drag-handle";

interface RowAggregateBracketProps {
  outputKey: string;
  path: SlotPath[];
  fn: AggregateFunction;
  tableLabel: string;
  children: React.ReactNode;
  onRemove: () => void;
}

export function RowAggregateBracket({
  outputKey,
  path,
  fn,
  tableLabel,
  children,
  onRemove,
}: RowAggregateBracketProps) {
  const t = useTranslations("builder");
  const pathKey = path.join("-") || "root";
  const dropId = `${outputKey}-rows-drop-${pathKey}`;
  const dragId = `${outputKey}-rows-drag-${pathKey}`;

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: dropId,
    data: { path, target: "rowAggregate" as const },
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
      kind: "aggregate" as const,
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
          : "border-indigo-400/50 bg-indigo-500/10"
      }`}
    >
      <DragHandle
        setNodeRef={setDragRef}
        listeners={listeners}
        attributes={attributes}
        label={t("dragHandleRowAggregate")}
        compact
      />
      <span className="select-none text-sm font-bold uppercase tracking-wide text-indigo-800 dark:text-indigo-200">
        {fn}
      </span>
      <span className="select-none text-xs font-medium text-indigo-700/80 dark:text-indigo-200/80">
        {t("rowsLabel")} · {tableLabel}
      </span>
      <span className="select-none text-lg font-bold leading-none text-indigo-700 dark:text-indigo-300">
        (
      </span>
      <div className="flex min-w-[40px] flex-wrap items-center gap-2">{children}</div>
      <span className="select-none text-lg font-bold leading-none text-indigo-700 dark:text-indigo-300">
        )
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 z-10 flex size-5 min-h-[28px] min-w-[28px] touch-manipulation items-center justify-center rounded-full bg-destructive text-[10px] text-white shadow-sm"
        aria-label={t("removeRowAggregate")}
      >
        ×
      </button>
    </div>
  );
}
