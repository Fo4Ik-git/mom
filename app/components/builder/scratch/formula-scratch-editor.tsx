"use client";

import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  closestCenter,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { arrayMove } from "@dnd-kit/sortable";
import { useTranslations } from "next-intl";
import { useEffect, useMemo, useState } from "react";
import type { BlockExpression, CalculatorConfig } from "@/types/calculator";
import { emptyBlockExpression } from "@/types/calculator";
import { formatBlockExpression } from "@/lib/formula/block-format";
import { buildPaletteBlocks, type PaletteBlock } from "@/lib/formula/block-palette";
import {
  buildFormulaSnippets,
  resolveSnippetPick,
  type FormulaSnippetPick,
} from "@/lib/formula/formula-snippets";
import type { FormulaTarget } from "@/lib/formula/formula-target";
import {
  flattenExpression,
  isReorderableChain,
  tokensToExpression,
} from "@/lib/formula/block-tokens";
import {
  applyPaletteToSlot,
  clearSlot,
  getSlotExpression,
  moveExpressionToSlot,
  removeGroupAt,
  removeOperationAt,
  swapOperators,
  type PaletteDragData,
  type SlotPath,
  type WorkspaceDragData,
} from "@/lib/formula/block-tree";
import { BlockPaletteSheet } from "@/app/components/builder/scratch/block-palette-sheet";
import { DraggableBlock } from "@/app/components/builder/scratch/draggable-block";
import { FormulaLinearWorkspace } from "@/app/components/builder/scratch/formula-linear-workspace";
import { useTouchBuilderUi } from "@/lib/hooks/use-media-query";

interface FormulaScratchEditorProps {
  config: CalculatorConfig;
  formulaTarget: FormulaTarget;
  outputKey: string;
  expression: BlockExpression;
  onChange: (expression: BlockExpression) => void;
}

export function FormulaScratchEditor({
  config,
  formulaTarget,
  outputKey,
  expression,
  onChange,
}: FormulaScratchEditorProps) {
  const t = useTranslations("builder");
  const tc = useTranslations("common");
  const quantityLabel = t("quantityLabel");

  const [mounted, setMounted] = useState(false);
  const [activeBlock, setActiveBlock] = useState<PaletteBlock | null>(null);
  const [activeDragLabel, setActiveDragLabel] = useState<string | null>(null);
  const [activeSlot, setActiveSlot] = useState<SlotPath[] | null>(null);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [snippetPick, setSnippetPick] = useState<FormulaSnippetPick | null>(null);
  const touchUi = useTouchBuilderUi();

  const paletteBlocks = useMemo(
    () => buildPaletteBlocks(config, formulaTarget, quantityLabel),
    [config, formulaTarget, quantityLabel],
  );

  const snippetBlocks = useMemo(
    () =>
      buildFormulaSnippets(config, quantityLabel, {
        qtyTimes: t("snippetQtyTimes"),
        margin: t("snippetMargin"),
        withConstant: t("snippetWithConstant"),
        pickProperty: t("snippetPickChoose"),
        pickPrice: t("snippetPickPrice"),
        pickCost: t("snippetPickCost"),
        pickConstant: t("snippetPickConstant"),
      }),
    [config, quantityLabel, t],
  );

  const flatTokens = useMemo(
    () => flattenExpression(expression),
    [expression],
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 150, tolerance: 6 },
    }),
  );

  function applyToSlot(path: SlotPath[], data: PaletteDragData) {
    onChange(applyPaletteToSlot(expression, path, data));
  }

  function handleDragStart(event: DragStartEvent) {
    const id = String(event.active.id);
    const block = paletteBlocks.find((b) => `palette-${b.id}` === id);
    if (block) {
      setActiveBlock(block);
      setActiveDragLabel(block.label);
      return;
    }

    const token = flatTokens.find((item) => item.id === id);
    if (token) {
      setActiveDragLabel(
        token.kind === "operand"
          ? formatBlockExpression(
              { type: "operand", operand: token.operand },
              config,
              formulaTarget,
              quantityLabel,
            )
          : token.kind === "operator"
            ? (token.operator === "*" ? "×" : token.operator)
            : "…",
      );
      return;
    }

    const workspace = event.active.data.current as WorkspaceDragData | undefined;
    if (workspace?.source === "workspace") {
      if (workspace.kind === "operator") {
        setActiveDragLabel(
          workspace.operator === "*" ? "×" : workspace.operator,
        );
        return;
      }
      if (workspace.kind === "group") {
        const groupExpr = getSlotExpression(expression, workspace.path);
        const inner =
          groupExpr.type === "group" ? groupExpr.inner : groupExpr;
        setActiveDragLabel(
          `( ${formatBlockExpression(inner, config, formulaTarget, quantityLabel)} )`,
        );
        return;
      }
      if (workspace.kind === "slot") {
        const slotExpr = getSlotExpression(expression, workspace.path);
        if (slotExpr.type === "operand") {
          setActiveDragLabel(
            formatBlockExpression(slotExpr, config, formulaTarget, quantityLabel),
          );
        } else if (slotExpr.type === "group") {
          setActiveDragLabel(
            `( ${formatBlockExpression(slotExpr.inner, config, formulaTarget, quantityLabel)} )`,
          );
        }
      }
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    setActiveBlock(null);
    setActiveDragLabel(null);

    const over = event.over;
    if (!over) {
      return;
    }

    const activeId = String(event.active.id);
    const overId = String(over.id);

    const dragData = event.active.data.current as
      | PaletteDragData
      | WorkspaceDragData
      | { source: "workspace-token"; tokenId: string }
      | undefined;

    if (dragData?.source === "palette") {
      const overData = over.data.current as
        | { path?: SlotPath[]; target?: string }
        | undefined;
      const path = overData?.path ?? [];
      if (overData?.target === "group" && dragData.kind !== "group") {
        onChange(applyPaletteToSlot(expression, [...path, "inner"], dragData));
      } else {
        applyToSlot(path, dragData);
      }
      setActiveSlot(null);
      return;
    }

    if (
      isReorderableChain(expression) &&
      flatTokens.some((t) => t.id === activeId) &&
      flatTokens.some((t) => t.id === overId) &&
      activeId !== overId
    ) {
      const oldIndex = flatTokens.findIndex((t) => t.id === activeId);
      const newIndex = flatTokens.findIndex((t) => t.id === overId);
      if (oldIndex >= 0 && newIndex >= 0) {
        onChange(
          tokensToExpression(arrayMove(flatTokens, oldIndex, newIndex)),
        );
      }
      setActiveSlot(null);
      return;
    }

    const workspaceActive = dragData as WorkspaceDragData | undefined;
    const workspaceOver = over.data.current as
      | { path?: SlotPath[]; target?: string }
      | WorkspaceDragData
      | undefined;

    if (workspaceActive?.source === "workspace") {
      const overPath = (
        workspaceOver && "path" in workspaceOver ? workspaceOver.path : undefined
      ) as SlotPath[] | undefined;

      if (
        (workspaceActive.kind === "slot" || workspaceActive.kind === "group") &&
        overPath
      ) {
        onChange(
          moveExpressionToSlot(expression, workspaceActive.path, overPath),
        );
        setActiveSlot(null);
        return;
      }

      if (
        workspaceActive.kind === "operator" &&
        workspaceOver &&
        "source" in workspaceOver &&
        workspaceOver.source === "workspace" &&
        workspaceOver.kind === "operator"
      ) {
        onChange(
          swapOperators(
            expression,
            workspaceActive.path,
            workspaceOver.path,
          ),
        );
        setActiveSlot(null);
      }
    }
  }

  function insertPaletteItem(data: PaletteDragData) {
    const path = activeSlot ?? [];
    applyToSlot(path, data);
    setActiveSlot(null);
    setPaletteOpen(false);
    setSnippetPick(null);
  }

  function handleBlockTap(block: PaletteBlock) {
    if (block.pick) {
      setSnippetPick(block.pick);
      return;
    }

    insertPaletteItem({
      source: "palette",
      ...block.dragData,
    });
  }

  function handleSnippetPickConfirm(selection: {
    propertyId?: string;
    leftPropertyId?: string;
    rightPropertyId?: string;
    constantId?: string;
  }) {
    if (!snippetPick) {
      return;
    }
    const expression = resolveSnippetPick(snippetPick, selection);
    if (!expression) {
      return;
    }
    insertPaletteItem({
      source: "palette",
      kind: "expression",
      expression,
    });
  }

  function handleSlotTap(path: SlotPath[]) {
    setActiveSlot(path);
    setPaletteOpen(true);
  }

  function closePalette() {
    setPaletteOpen(false);
    setActiveSlot(null);
    setSnippetPick(null);
  }

  const preview = formatBlockExpression(
    expression,
    config,
    formulaTarget,
    quantityLabel,
  );

  if (!mounted) {
    return (
      <div className="space-y-3 rounded-xl border border-dashed border-accent/40 bg-accent-muted/15 p-3">
        <p className="text-xs font-medium text-accent">{t("formulaTitle")}</p>
        <div className="min-h-[52px] rounded-2xl border-2 border-dashed border-accent/30 bg-accent-muted/10 p-3">
          <p className="text-sm text-muted-foreground">{tc("loading")}</p>
        </div>
        <div className="rounded-lg bg-card px-3 py-2">
          <span className="text-xs uppercase tracking-wide text-muted-foreground">
            {t("formulaPreview")}
          </span>
          <p className="mt-1 text-sm font-medium text-foreground">
            {preview || "…"}
          </p>
        </div>
      </div>
    );
  }

  return (
    <DndContext
      id={outputKey}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3 rounded-xl border border-dashed border-accent/40 bg-accent-muted/15 p-3">
        <p className="text-xs font-medium text-accent">{t("formulaTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("blocksMobileHint")}</p>

        <div className="space-y-3">
          {activeSlot && (
            <p className="rounded-lg bg-accent/10 px-3 py-2 text-xs text-accent">
              {t("blocksTapToInsert")}
            </p>
          )}

          <div className="flex items-start justify-end">
            <button
              type="button"
              onClick={() => onChange(emptyBlockExpression())}
              className="shrink-0 text-xs text-destructive hover:underline"
            >
              {t("blocksClearAll")}
            </button>
          </div>

          <FormulaLinearWorkspace
            outputKey={outputKey}
            expression={expression}
            config={config}
            formulaTarget={formulaTarget}
            quantityLabel={quantityLabel}
            touchUi={touchUi}
            activeSlotPath={activeSlot}
            onSlotClear={(path) => onChange(clearSlot(expression, path))}
            onOperationRemove={(path) =>
              onChange(removeOperationAt(expression, path))
            }
            onGroupRemove={(path) =>
              onChange(removeGroupAt(expression, path))
            }
            onSlotTap={handleSlotTap}
          />

          <div className="rounded-lg bg-card px-3 py-2">
            <span className="text-xs uppercase tracking-wide text-muted-foreground">
              {t("formulaPreview")}
            </span>
            <p className="mt-1 text-sm font-medium text-foreground">{preview}</p>
          </div>
        </div>

        <BlockPaletteSheet
          open={paletteOpen}
          config={config}
          blocks={paletteBlocks}
          snippetBlocks={snippetBlocks}
          snippetPick={snippetPick}
          onBlockTap={handleBlockTap}
          onSnippetPickCancel={() => setSnippetPick(null)}
          onSnippetPickConfirm={handleSnippetPickConfirm}
          onClose={closePalette}
        />
      </div>

      <DragOverlay dropAnimation={null}>
        {activeBlock ? (
          <div className="rotate-2 scale-105 opacity-95">
            <DraggableBlock block={activeBlock} />
          </div>
        ) : activeDragLabel ? (
          <div className="rounded-xl border border-accent bg-accent px-3 py-2 text-sm font-semibold text-accent-foreground shadow-lg">
            {activeDragLabel}
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
