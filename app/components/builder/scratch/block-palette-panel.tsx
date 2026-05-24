"use client";

import { useTranslations } from "next-intl";
import type { PaletteBlock } from "@/lib/formula/block-palette";
import { DraggableBlock } from "@/app/components/builder/scratch/draggable-block";

interface BlockPalettePanelProps {
  blocks: PaletteBlock[];
  onBlockTap: (block: PaletteBlock) => void;
}

export function BlockPalettePanel({
  blocks,
  onBlockTap,
}: BlockPalettePanelProps) {
  const t = useTranslations("builder");

  const operands = blocks.filter((b) => b.category === "operand");
  const constants = blocks.filter((b) => b.category === "constant");
  const operators = blocks.filter((b) => b.category === "operator");
  const groups = blocks.filter((b) => b.category === "group");

  return (
    <div className="space-y-3 rounded-2xl border border-border bg-card p-3">
      <p className="text-xs font-semibold text-muted-foreground">
        {t("blocksPalette")}
      </p>
      <p className="text-xs text-muted-foreground">{t("blocksPaletteHint")}</p>

      <div className="space-y-2">
        <p className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
          {t("blocksVariables")}
        </p>
        <div className="flex flex-wrap gap-2">
          {operands.map((block) => (
            <DraggableBlock
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
              <DraggableBlock
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
            <DraggableBlock
              key={block.id}
              block={block}
              onTap={() => onBlockTap(block)}
            />
          ))}
          {groups.map((block) => (
            <DraggableBlock
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
