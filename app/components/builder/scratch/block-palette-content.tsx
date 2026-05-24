"use client";

import { useTranslations } from "next-intl";
import type { PaletteBlock } from "@/lib/formula/block-palette";
import { BLOCK_COLORS } from "@/lib/formula/block-palette";
import { DraggableBlock } from "@/app/components/builder/scratch/draggable-block";

interface BlockPaletteContentProps {
  blocks: PaletteBlock[];
  onBlockTap: (block: PaletteBlock) => void;
  dragEnabled?: boolean;
  vertical?: boolean;
}

function TapBlock({
  block,
  onTap,
  vertical = false,
}: {
  block: PaletteBlock;
  onTap: () => void;
  vertical?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={`min-h-[44px] touch-manipulation rounded-xl border px-3 py-2.5 text-left text-sm font-medium shadow-sm active:scale-[0.98] ${vertical ? "w-full" : ""} ${BLOCK_COLORS[block.color]}`}
    >
      {block.label}
    </button>
  );
}

export function BlockPaletteContent({
  blocks,
  onBlockTap,
  dragEnabled = true,
  vertical = false,
}: BlockPaletteContentProps) {
  const t = useTranslations("builder");

  const operands = blocks.filter((b) => b.category === "operand");
  const constants = blocks.filter((b) => b.category === "constant");
  const operators = blocks.filter((b) => b.category === "operator");
  const groups = blocks.filter((b) => b.category === "group");
  const groupClass = vertical ? "flex flex-col gap-2" : "flex flex-wrap gap-2";

  function renderBlock(block: PaletteBlock) {
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
      <TapBlock
        key={block.id}
        block={block}
        vertical={vertical}
        onTap={() => onBlockTap(block)}
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("blocksVariables")}
        </p>
        <div className={groupClass}>{operands.map(renderBlock)}</div>
      </div>

      {constants.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("blocksConstants")}
          </p>
          <div className={groupClass}>{constants.map(renderBlock)}</div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("blocksOperators")}
        </p>
        <div className={groupClass}>
          {operators.map(renderBlock)}
          {groups.map(renderBlock)}
        </div>
      </div>
    </div>
  );
}
