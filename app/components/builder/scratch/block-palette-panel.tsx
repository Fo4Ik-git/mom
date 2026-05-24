"use client";

import { useTranslations } from "next-intl";
import type { PaletteBlock } from "@/lib/formula/block-palette";
import { BlockPaletteContent } from "@/app/components/builder/scratch/block-palette-content";

interface BlockPalettePanelProps {
  blocks: PaletteBlock[];
  onBlockTap: (block: PaletteBlock) => void;
  className?: string;
}

export function BlockPalettePanel({
  blocks,
  onBlockTap,
  className = "",
}: BlockPalettePanelProps) {
  const t = useTranslations("builder");

  return (
    <div
      className={`space-y-3 rounded-2xl border border-border bg-card p-3 ${className}`.trim()}
    >
      <p className="text-xs font-semibold text-muted-foreground">
        {t("blocksPalette")}
      </p>
      <p className="text-xs text-muted-foreground">{t("blocksPaletteHint")}</p>
      <BlockPaletteContent blocks={blocks} onBlockTap={onBlockTap} dragEnabled />
    </div>
  );
}
