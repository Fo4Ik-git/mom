"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import type { AggregateFunction } from "@/types/calculator";
import type { SlotPath } from "@/lib/formula/block-tree";
import { DragHandle } from "@/app/components/builder/scratch/drag-handle";

interface AggregateBracketProps {
  outputKey: string;
  path: SlotPath[];
  fn: AggregateFunction;
  children: React.ReactNode;
  onRemove: () => void;
}

export function AggregateBracket({
  outputKey,
  path,
  fn,
  children,
  onRemove,
}: AggregateBracketProps) {
  const t = useTranslations("builder");
  const pathKey = path.join("-") || "root";
  const dropId = `${outputKey}-agg-drop-${pathKey}`;
  const dragId = `${outputKey}-agg-drag-${pathKey}`;

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: dropId,
    data: { path, target: "aggregate" as const },
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
      function: fn,
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
          : "border-fuchsia-400/50 bg-fuchsia-500/10"
      }`}
    >
      <DragHandle
        setNodeRef={setDragRef}
        listeners={listeners}
        attributes={attributes}
        label={t("dragHandleAggregate")}
        compact
      />
      <span className="select-none text-sm font-bold uppercase tracking-wide text-fuchsia-800 dark:text-fuchsia-200">
        {fn}
      </span>
      <span className="select-none text-lg font-bold leading-none text-fuchsia-700 dark:text-fuchsia-300">
        (
      </span>
      <div className="flex min-w-[40px] flex-wrap items-center gap-1.5">{children}</div>
      <span className="select-none text-lg font-bold leading-none text-fuchsia-700 dark:text-fuchsia-300">
        )
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 z-10 flex size-5 min-h-[28px] min-w-[28px] touch-manipulation items-center justify-center rounded-full bg-destructive text-[10px] text-white shadow-sm"
        aria-label={t("removeAggregate")}
      >
        ×
      </button>
    </div>
  );
}
