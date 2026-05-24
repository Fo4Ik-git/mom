"use client";

import { useTranslations } from "next-intl";
import type { PaletteBlock } from "@/lib/formula/block-palette";
import { BLOCK_COLORS } from "@/lib/formula/block-palette";
import { DraggableBlock } from "@/app/components/builder/scratch/draggable-block";

interface BlockPaletteContentProps {
  blocks: PaletteBlock[];
  onBlockTap: (block: PaletteBlock) => void;
  /** Desktop: draggable blocks. Mobile sheet: large tap targets only. */
  dragEnabled?: boolean;
}

function TapBlock({
  block,
  onTap,
}: {
  block: PaletteBlock;
  onTap: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onTap}
      className={`min-h-[44px] touch-manipulation rounded-xl border px-3 py-2.5 text-left text-sm font-medium shadow-sm active:scale-[0.98] ${BLOCK_COLORS[block.color]}`}
    >
      {block.label}
    </button>
  );
}

export function BlockPaletteContent({
  blocks,
  onBlockTap,
  dragEnabled = true,
}: BlockPaletteContentProps) {
  const t = useTranslations("builder");

  const operands = blocks.filter((b) => b.category === "operand");
  const constants = blocks.filter((b) => b.category === "constant");
  const operators = blocks.filter((b) => b.category === "operator");
  const groups = blocks.filter((b) => b.category === "group");

  const BlockButton = dragEnabled ? DraggableBlock : TapBlock;

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("blocksVariables")}
        </p>
        <div className="flex flex-wrap gap-2">
          {operands.map((block) => (
            <BlockButton
              key={block.id}
              block={block}
              onTap={() => onBlockTap(block)}
            />
          ))}
        </div>
      </div>

      {constants.length > 0 && (
        <div className="space-y-2">
          <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
            {t("blocksConstants")}
          </p>
          <div className="flex flex-wrap gap-2">
            {constants.map((block) => (
              <BlockButton
                key={block.id}
                block={block}
                onTap={() => onBlockTap(block)}
              />
            ))}
          </div>
        </div>
      )}

      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("blocksOperators")}
        </p>
        <div className="flex flex-wrap gap-2">
          {operators.map((block) => (
            <BlockButton
              key={block.id}
              block={block}
              onTap={() => onBlockTap(block)}
            />
          ))}
          {groups.map((block) => (
            <BlockButton
              key={block.id}
              block={block}
              onTap={() => onBlockTap(block)}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
