"use client";

import { useDraggable, useDroppable } from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { useTranslations } from "next-intl";
import type { FormulaOperator } from "@/types/calculator";
import type { SlotPath, WorkspaceDragData } from "@/lib/formula/blocks/block-tree";
import { DragHandle } from "@/app/components/builder/scratch/drag-handle";

function operatorSymbol(operator: FormulaOperator): string {
  switch (operator) {
    case "*":
      return "×";
    case "/":
      return "÷";
    default:
      return operator;
  }
}

interface OperatorChipProps {
  operator: FormulaOperator;
  path?: SlotPath[];
  draggable?: boolean;
  onRemove: () => void;
}

export function OperatorChip({
  operator,
  path = [],
  draggable = false,
  onRemove,
}: OperatorChipProps) {
  const t = useTranslations("builder");
  const opPathKey = path.join("-") || "root";

  const {
    attributes,
    listeners,
    setNodeRef: setDragRef,
    transform,
    isDragging,
  } = useDraggable({
    id: `workspace-op-${opPathKey}`,
    data: {
      source: "workspace",
      kind: "operator",
      path,
      operator,
    } satisfies WorkspaceDragData,
    disabled: !draggable,
  });

  const { isOver, setNodeRef: setDropRef } = useDroppable({
    id: `workspace-op-drop-${opPathKey}`,
    data: {
      source: "workspace",
      kind: "operator",
      path,
      operator,
    } satisfies WorkspaceDragData,
    disabled: !draggable,
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
      className={`relative flex shrink-0 items-center gap-0.5 select-none ${isOver ? "rounded-lg ring-2 ring-accent/50" : ""}`}
    >
      {draggable && (
        <DragHandle
          setNodeRef={setDragRef}
          listeners={listeners}
          attributes={attributes}
          label={t("dragHandle")}
          compact
        />
      )}
      <span className="inline-flex min-w-[36px] select-none items-center justify-center rounded-lg border border-amber-400/50 bg-amber-500/20 px-2.5 py-1.5 text-base font-bold text-amber-900 dark:text-amber-100">
        {operatorSymbol(operator)}
      </span>
      <button
        type="button"
        onClick={(event) => {
          event.stopPropagation();
          onRemove();
        }}
        className="absolute -right-1.5 -top-1.5 flex size-6 min-h-[28px] min-w-[28px] touch-manipulation items-center justify-center rounded-full bg-destructive text-[10px] text-white shadow-sm"
        aria-label="Remove operator"
      >
        ×
      </button>
    </div>
  );
}
