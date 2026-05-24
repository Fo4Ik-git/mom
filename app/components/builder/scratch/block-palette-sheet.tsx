"use client";

import { useTranslations } from "next-intl";
import { useEffect } from "react";
import type { CalculatorConfig } from "@/types/calculator";
import type { PaletteBlock } from "@/lib/formula/block-palette";
import type { FormulaSnippetPick } from "@/lib/formula/formula-snippets";
import { BlockPaletteContent } from "@/app/components/builder/scratch/block-palette-content";

interface BlockPaletteSheetProps {
  open: boolean;
  config: CalculatorConfig;
  blocks: PaletteBlock[];
  snippetBlocks?: PaletteBlock[];
  snippetPick?: FormulaSnippetPick | null;
  onBlockTap: (block: PaletteBlock) => void;
  onSnippetPickCancel?: () => void;
  onSnippetPickConfirm?: (selection: {
    propertyId?: string;
    leftPropertyId?: string;
    rightPropertyId?: string;
    constantId?: string;
  }) => void;
  onClose: () => void;
}

export function BlockPaletteSheet({
  open,
  config,
  blocks,
  snippetBlocks = [],
  snippetPick,
  onBlockTap,
  onSnippetPickCancel,
  onSnippetPickConfirm,
  onClose,
}: BlockPaletteSheetProps) {
  const t = useTranslations("builder");
  const tc = useTranslations("common");

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  if (!open) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        aria-label={tc("cancel")}
        className="fixed inset-0 z-40 bg-black/50 touch-manipulation"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal
        aria-labelledby="block-palette-sheet-title"
        className="fixed inset-y-0 right-0 z-50 flex w-[min(100%,22rem)] max-w-full flex-col border-l border-border bg-card shadow-card-lg sm:w-80"
      >
        <div className="flex shrink-0 items-start justify-between gap-2 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h3
              id="block-palette-sheet-title"
              className="text-base font-semibold text-foreground"
            >
              {snippetPick ? t("snippetPickTitle") : t("blocksMobileInsertTitle")}
            </h3>
            <p className="text-xs text-muted-foreground">
              {snippetPick
                ? t("snippetPickHint")
                : t("blocksMobilePaletteHint")}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-border text-lg text-muted-foreground hover:bg-muted"
            aria-label={tc("cancel")}
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-4">
          <BlockPaletteContent
            config={config}
            blocks={blocks}
            snippetBlocks={snippetBlocks}
            vertical
            dragEnabled={false}
            snippetPick={snippetPick}
            onSnippetPickCancel={onSnippetPickCancel}
            onSnippetPickConfirm={onSnippetPickConfirm}
            onBlockTap={onBlockTap}
          />
        </div>
      </div>
    </>
  );
}
