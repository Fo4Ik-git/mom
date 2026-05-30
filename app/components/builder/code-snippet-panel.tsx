"use client";

import { useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { BlockPaletteContent } from "@/app/components/builder/scratch/block-palette-content";
import type { PaletteBlock } from "@/lib/formula/blocks/block-palette";
import { formatExpressionForScriptInsert } from "@/lib/formula/code/expression-insert-text";
import {
  buildFormulaSnippets,
  resolveSnippetPick,
  type FormulaSnippetPick,
} from "@/lib/formula/core/formula-snippets";
import type { CalculatorConfig } from "@/types/calculator";

interface CodeSnippetPanelProps {
  config: CalculatorConfig;
  onInsert: (text: string) => void;
}

export function CodeSnippetPanel({ config, onInsert }: CodeSnippetPanelProps) {
  const t = useTranslations("builder");
  const [snippetPick, setSnippetPick] = useState<FormulaSnippetPick | null>(
    null,
  );
  const quantityLabel = t("quantityLabel");

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
        sumAllCost: t("snippetSumAllCost"),
        sumAllPrice: t("snippetSumAllPrice"),
        globalMargin: t("snippetGlobalMargin"),
      }),
    [config, quantityLabel, t],
  );

  function insertExpression(expression: Parameters<typeof formatExpressionForScriptInsert>[0]) {
    onInsert(formatExpressionForScriptInsert(expression));
    setSnippetPick(null);
  }

  function handleBlockTap(block: PaletteBlock) {
    if (block.pick) {
      setSnippetPick(block.pick);
      return;
    }
    if (block.dragData.kind === "expression") {
      insertExpression(block.dragData.expression);
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <p className="shrink-0 px-3 py-2 text-xs font-semibold text-muted-foreground">
        {t("codeEditorSnippets")}
      </p>
      <p className="shrink-0 px-3 pb-2 text-[11px] leading-snug text-muted-foreground">
        {t("codeEditorSnippetsHint")}
      </p>
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-2 pb-2">
        <BlockPaletteContent
          config={config}
          blocks={[]}
          snippetBlocks={snippetBlocks}
          vertical
          dragEnabled={false}
          snippetPick={snippetPick}
          onSnippetPickCancel={() => setSnippetPick(null)}
          onSnippetPickConfirm={(selection) => {
            if (!snippetPick) {
              return;
            }
            const expression = resolveSnippetPick(snippetPick, selection);
            if (expression) {
              insertExpression(expression);
            }
          }}
          onBlockTap={handleBlockTap}
        />
      </div>
    </div>
  );
}
