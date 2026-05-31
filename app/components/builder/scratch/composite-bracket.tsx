"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import type { SlotPath } from "@/lib/formula/blocks/block-tree";
import type { CompositeBlockUi } from "@/lib/formula/nodes/block-ui-registry";
import { DragHandle } from "@/app/components/builder/scratch/drag-handle";

interface CompositeBracketProps {
  ui: CompositeBlockUi;
  outputKey: string;
  path: SlotPath[];
  children: React.ReactNode;
  onRemove: () => void;
}

export function CompositeBracket({
  ui,
  outputKey,
  path,
  children,
  onRemove,
}: CompositeBracketProps) {
  const t = useTranslations("builder");
  const pathKey = path.join("-") || "root";
  const dropId = `${outputKey}-${ui.dropTarget}-drop-${pathKey}`;
  const dragId = `${outputKey}-${ui.dropTarget}-drag-${pathKey}`;

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: dropId,
    data: { path, target: ui.dropTarget },
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
      kind: ui.workspaceKind,
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
          : ui.borderClass
      }`}
    >
      <DragHandle
        setNodeRef={setDragRef}
        listeners={listeners}
        attributes={attributes}
        label={t(ui.dragHandleKey)}
        compact
      />
      <span
        className={`select-none text-sm font-bold uppercase tracking-wide ${ui.keywordTextClass}`}
      >
        {ui.keyword}
      </span>
      <span
        className={`select-none text-lg font-bold leading-none ${ui.parenTextClass}`}
      >
        (
      </span>
      <div className="flex min-w-[40px] flex-wrap items-center gap-1.5">
        {children}
      </div>
      <span
        className={`select-none text-lg font-bold leading-none ${ui.parenTextClass}`}
      >
        )
      </span>
      <button
        type="button"
        onClick={onRemove}
        className="absolute -right-1.5 -top-1.5 z-10 flex size-5 min-h-[28px] min-w-[28px] touch-manipulation items-center justify-center rounded-full bg-destructive text-[10px] text-white shadow-sm"
        aria-label={t(ui.removeKey)}
      >
        ×
      </button>
    </div>
  );
}
