"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import type { CalculatorConfig } from "@/types/calculator";
import type { PaletteBlock } from "@/lib/formula/block-palette";
import type { FormulaSnippetPick } from "@/lib/formula/formula-snippets";
import { BlockPaletteContent } from "@/app/components/builder/scratch/block-palette-content";

const STORAGE_KEY = "builder-palette-sheet-width";
const DEFAULT_WIDTH = 320;
const MIN_WIDTH = 260;
const MAX_WIDTH = 560;

function clampWidth(value: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));
}

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
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const widthRef = useRef(width);
  widthRef.current = width;

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }
    const parsed = Number(stored);
    if (Number.isFinite(parsed)) {
      setWidth(clampWidth(parsed));
    }
  }, []);

  const handleResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = widthRef.current;
      const handle = event.currentTarget;

      handle.setPointerCapture(event.pointerId);

      const onMove = (moveEvent: PointerEvent) => {
        setWidth(
          clampWidth(startWidth + (startX - moveEvent.clientX)),
        );
      };

      const onUp = (upEvent: PointerEvent) => {
        handle.releasePointerCapture(upEvent.pointerId);
        localStorage.setItem(STORAGE_KEY, String(widthRef.current));
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onUp);
      };

      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onUp);
    },
    [],
  );

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
        style={{ width: `min(100%, ${width}px)` }}
        className="fixed inset-y-0 right-0 z-50 flex max-w-full flex-col border-l border-border bg-card shadow-card-lg"
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t("paletteResizeHandle")}
          onPointerDown={handleResizePointerDown}
          className="absolute inset-y-0 left-0 z-10 w-2 -translate-x-1/2 cursor-ew-resize touch-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border hover:before:bg-accent/60 active:before:bg-accent"
        />
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
