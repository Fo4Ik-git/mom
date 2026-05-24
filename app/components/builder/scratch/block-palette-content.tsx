"use client";

import { type ReactNode, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import type { CalculatorConfig } from "@/types/calculator";
import type { PaletteBlock } from "@/lib/formula/block-palette";
import { BLOCK_COLORS } from "@/lib/formula/block-palette";
import type { FormulaSnippetPick } from "@/lib/formula/formula-snippets";
import { snippetPickTitle } from "@/lib/formula/formula-snippets";
import {
  countPaletteItems,
  filterGroupedBlocks,
  filterPaletteBlocks,
  groupOperandBlocksByInput,
  groupSnippetsByField,
  type PaletteTab,
} from "@/lib/formula/palette-organizer";
import { DraggableBlock } from "@/app/components/builder/scratch/draggable-block";

interface BlockPaletteContentProps {
  config: CalculatorConfig;
  blocks: PaletteBlock[];
  snippetBlocks?: PaletteBlock[];
  onBlockTap: (block: PaletteBlock) => void;
  dragEnabled?: boolean;
  vertical?: boolean;
  snippetPick?: FormulaSnippetPick | null;
  onSnippetPickCancel?: () => void;
  onSnippetPickConfirm?: (selection: {
    propertyId?: string;
    leftPropertyId?: string;
    rightPropertyId?: string;
    constantId?: string;
  }) => void;
}

function PaletteItemRow({
  block,
  onTap,
  compact = false,
}: {
  block: PaletteBlock;
  onTap: () => void;
  compact?: boolean;
}) {
  const title = block.meta?.title ?? block.label;
  const hint = block.meta?.hint;

  return (
    <button
      type="button"
      onClick={onTap}
      className={`flex w-full touch-manipulation items-start gap-2 rounded-xl border px-3 py-2 text-left shadow-sm active:scale-[0.99] ${BLOCK_COLORS[block.color]} ${compact ? "min-h-[40px]" : "min-h-[44px]"}`}
    >
      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium leading-snug">
          {title}
        </span>
        {hint && (
          <span className="mt-0.5 block truncate text-[11px] font-normal opacity-75">
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

function CollapsibleGroup({
  label,
  count,
  defaultOpen = false,
  children,
}: {
  label: string;
  count: number;
  defaultOpen?: boolean;
  children: ReactNode;
}) {
  return (
    <details
      className="group rounded-xl border border-border/70 bg-muted/20"
      open={defaultOpen}
    >
      <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2.5 text-sm font-medium text-foreground marker:content-none [&::-webkit-details-marker]:hidden">
        <span className="truncate">{label}</span>
        <span className="shrink-0 rounded-full bg-background px-2 py-0.5 text-[10px] text-muted-foreground">
          {count}
        </span>
      </summary>
      <div className="space-y-1.5 border-t border-border/60 px-2 pb-2 pt-1.5">
        {children}
      </div>
    </details>
  );
}

export function BlockPaletteContent({
  config,
  blocks,
  snippetBlocks = [],
  onBlockTap,
  dragEnabled = true,
  vertical = false,
  snippetPick,
  onSnippetPickCancel,
  onSnippetPickConfirm,
}: BlockPaletteContentProps) {
  const t = useTranslations("builder");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<PaletteTab>(
    snippetBlocks.length > 0 ? "snippets" : "blocks",
  );
  const [leftPropertyId, setLeftPropertyId] = useState("");
  const [rightPropertyId, setRightPropertyId] = useState("");

  const operands = blocks.filter((b) => b.category === "operand");
  const calculations = operands.filter((b) => b.color === "calculation");
  const outputs = operands.filter((b) => b.color === "output");
  const constants = blocks.filter((b) => b.category === "constant");
  const operators = blocks.filter((b) => b.category === "operator");
  const groups = blocks.filter((b) => b.category === "group");

  const inputGroups = useMemo(
    () => groupOperandBlocksByInput(operands, config.inputs),
    [operands, config.inputs],
  );

  const snippetGroups = useMemo(
    () => groupSnippetsByField(snippetBlocks),
    [snippetBlocks],
  );

  const filteredInputGroups = useMemo(
    () => filterGroupedBlocks(inputGroups, query),
    [inputGroups, query],
  );

  const filteredSnippetGroups = useMemo(
    () => filterGroupedBlocks(snippetGroups, query),
    [snippetGroups, query],
  );

  const filteredCalculations = useMemo(
    () => filterPaletteBlocks(calculations, query),
    [calculations, query],
  );

  const filteredOutputs = useMemo(
    () => filterPaletteBlocks(outputs, query),
    [outputs, query],
  );

  const filteredConstants = useMemo(
    () => filterPaletteBlocks(constants, query),
    [constants, query],
  );

  const filteredActions = useMemo(
    () => filterPaletteBlocks([...operators, ...groups], query),
    [operators, groups, query],
  );

  const tabCounts = {
    snippets: countPaletteItems(filteredSnippetGroups),
    blocks:
      countPaletteItems(filteredInputGroups, [
        ...filteredCalculations,
        ...filteredOutputs,
        ...filteredConstants,
      ]),
    actions: filteredActions.length,
  };

  function renderTapItem(block: PaletteBlock) {
    if (dragEnabled) {
      return (
        <DraggableBlock
          key={block.id}
          block={block}
          onTap={() => onBlockTap(block)}
        />
      );
    }
    return (
      <PaletteItemRow
        key={block.id}
        block={block}
        onTap={() => onBlockTap(block)}
      />
    );
  }

  if (snippetPick && onSnippetPickCancel && onSnippetPickConfirm) {
    return (
      <div className="space-y-4">
        <div className="space-y-1">
          <p className="text-sm font-semibold text-foreground">
            {snippetPickTitle(snippetPick, {
              pickPrice: t("snippetPickPrice"),
              pickCost: t("snippetPickCost"),
            })}
          </p>
          <p className="text-xs text-muted-foreground">
            {snippetPick.fieldLabel || "…"}
          </p>
        </div>

        {snippetPick.kind === "propertyPair" && (
          <div className="space-y-3">
            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">
                {t("snippetPickPrice")}
              </span>
              <select
                value={leftPropertyId}
                onChange={(e) => setLeftPropertyId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
              >
                <option value="">{t("snippetPickChoose")}</option>
                {snippetPick.properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.label}
                  </option>
                ))}
              </select>
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs text-muted-foreground">
                {t("snippetPickCost")}
              </span>
              <select
                value={rightPropertyId}
                onChange={(e) => setRightPropertyId(e.target.value)}
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
              >
                <option value="">{t("snippetPickChoose")}</option>
                {snippetPick.properties.map((property) => (
                  <option key={property.id} value={property.id}>
                    {property.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        )}

        <div className="flex gap-2">
          <button
            type="button"
            onClick={onSnippetPickCancel}
            className="flex-1 rounded-xl border border-border px-3 py-2 text-sm"
          >
            {t("snippetPickBack")}
          </button>
          <button
            type="button"
            disabled={
              snippetPick.kind === "propertyPair" &&
              (!leftPropertyId ||
                !rightPropertyId ||
                leftPropertyId === rightPropertyId)
            }
            onClick={() =>
              onSnippetPickConfirm({
                leftPropertyId,
                rightPropertyId,
              })
            }
            className="flex-1 rounded-xl bg-accent px-3 py-2 text-sm font-medium text-accent-foreground disabled:opacity-50"
          >
            {t("snippetPickInsert")}
          </button>
        </div>
      </div>
    );
  }

  const tabs: Array<{ id: PaletteTab; label: string; count: number }> = [
    { id: "snippets", label: t("paletteTabSnippets"), count: tabCounts.snippets },
    { id: "blocks", label: t("paletteTabBlocks"), count: tabCounts.blocks },
    { id: "actions", label: t("paletteTabActions"), count: tabCounts.actions },
  ];

  return (
    <div className="space-y-3">
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={t("paletteSearchPlaceholder")}
        className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
      />

      <div className="flex gap-1 rounded-xl bg-muted/50 p-1">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={`flex min-w-0 flex-1 items-center justify-center gap-1 rounded-lg px-2 py-2 text-[11px] font-medium leading-tight transition-colors ${
              tab === item.id
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            <span className="truncate">{item.label}</span>
            {item.count > 0 && (
              <span className="shrink-0 text-[10px] opacity-70">{item.count}</span>
            )}
          </button>
        ))}
      </div>

      {tab === "snippets" && (
        <div className="space-y-2">
          {filteredSnippetGroups.length === 0 ? (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
              {t("paletteEmptySnippets")}
            </p>
          ) : (
            filteredSnippetGroups.map((group, index) => (
              <CollapsibleGroup
                key={group.id}
                label={group.label}
                count={group.items.length}
                defaultOpen={index === 0 || Boolean(query.trim())}
              >
                {group.items.map(renderTapItem)}
              </CollapsibleGroup>
            ))
          )}
        </div>
      )}

      {tab === "blocks" && (
        <div className="space-y-2">
          {filteredInputGroups.map((group, index) => (
            <CollapsibleGroup
              key={group.id}
              label={group.label}
              count={group.items.length}
              defaultOpen={index === 0 || Boolean(query.trim())}
            >
              {group.items.map(renderTapItem)}
            </CollapsibleGroup>
          ))}

          {filteredCalculations.length > 0 && (
            <CollapsibleGroup
              label={t("paletteCalcFields")}
              count={filteredCalculations.length}
              defaultOpen={Boolean(query.trim())}
            >
              {filteredCalculations.map(renderTapItem)}
            </CollapsibleGroup>
          )}

          {filteredOutputs.length > 0 && (
            <CollapsibleGroup
              label={t("paletteOutputFields")}
              count={filteredOutputs.length}
              defaultOpen={Boolean(query.trim())}
            >
              {filteredOutputs.map(renderTapItem)}
            </CollapsibleGroup>
          )}

          {filteredConstants.length > 0 && (
            <CollapsibleGroup
              label={t("blocksConstants")}
              count={filteredConstants.length}
              defaultOpen={Boolean(query.trim())}
            >
              {filteredConstants.map(renderTapItem)}
            </CollapsibleGroup>
          )}

          {tabCounts.blocks === 0 && (
            <p className="px-1 py-6 text-center text-xs text-muted-foreground">
              {t("paletteEmptyBlocks")}
            </p>
          )}
        </div>
      )}

      {tab === "actions" && (
        <div className={vertical ? "grid grid-cols-4 gap-2" : "flex flex-wrap gap-2"}>
          {filteredActions.length === 0 ? (
            <p className="col-span-full px-1 py-6 text-center text-xs text-muted-foreground">
              {t("paletteEmptyActions")}
            </p>
          ) : (
            filteredActions.map(renderTapItem)
          )}
        </div>
      )}
    </div>
  );
}
