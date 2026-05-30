"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FormulaCodeEditor } from "@/app/components/builder/formula-code-editor";
import { formatFormulaCodeBlock } from "@/lib/formula/code-format";
import {
  normalizeParsedExpression,
  tryParseFormulaCode,
} from "@/lib/formula/code-parse";
import type { FormulaTarget } from "@/lib/formula/formula-target";
import type { BlockExpression, CalculatorConfig } from "@/types/calculator";

interface FormulaCodeModalProps {
  open: boolean;
  title: string;
  config: CalculatorConfig;
  target: FormulaTarget;
  expression: BlockExpression;
  onClose: () => void;
  onApply: (expression: BlockExpression) => void;
}

export function FormulaCodeModal({
  open,
  title,
  config,
  target,
  expression,
  onClose,
  onApply,
}: FormulaCodeModalProps) {
  const t = useTranslations("builder");
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDraft(formatFormulaCodeBlock(expression, target));
    setError(null);
  }, [open, expression, target]);

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  function handleApply() {
    const parsed = tryParseFormulaCode(draft, { target });
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    onApply(normalizeParsedExpression(parsed.expression));
    onClose();
  }

  function handleRevert() {
    setDraft(formatFormulaCodeBlock(expression, target));
    setError(null);
  }

  return (
    <>
      <button
        type="button"
        aria-label={t("codeModeClose")}
        className="fixed inset-0 z-40 bg-black/50 touch-manipulation"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal
          aria-labelledby="formula-code-modal-title"
          className="pointer-events-auto flex max-h-[min(88vh,720px)] w-full max-w-2xl flex-col rounded-2xl border border-border bg-card shadow-card-lg"
        >
          <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <h3
                id="formula-code-modal-title"
                className="truncate text-base font-semibold text-foreground"
              >
                {title}
              </h3>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {t("codeModeFormulaHint")}
              </p>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
              aria-label={t("codeModeClose")}
            >
              ×
            </button>
          </div>

          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
            <FormulaCodeEditor
              value={draft}
              onChange={(next) => {
                setDraft(next);
                setError(null);
              }}
              config={config}
              target={target}
              minHeight="360px"
            />
            {error && (
              <p className="mt-2 text-sm text-destructive">{error}</p>
            )}
          </div>

          <div className="flex shrink-0 flex-wrap gap-2 border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex flex-1 items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90 sm:flex-none"
            >
              {t("codeModeApply")}
            </button>
            <button
              type="button"
              onClick={handleRevert}
              className="inline-flex flex-1 items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted sm:flex-none"
            >
              {t("codeModeRevert")}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}
