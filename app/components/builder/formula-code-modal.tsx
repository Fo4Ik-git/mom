"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FormulaCodeEditor } from "@/app/components/builder/formula-code-editor";
import { useEditorShortcutLabels } from "@/app/components/builder/use-editor-shortcut-labels";
import { formatFormulaCodeBlock } from "@/lib/formula/code/code-format";
import { normalizeParsedExpression } from "@/lib/formula/code/code-parse";
import { tryParseFormulaProgram } from "@/lib/formula/code/formula-program";
import type { FormulaTarget } from "@/lib/formula/core/formula-target";
import type { BlockExpression, CalculatorConfig, FormulaLocal } from "@/types/calculator";

interface FormulaCodeModalProps {
  open: boolean;
  title: string;
  config: CalculatorConfig;
  target: FormulaTarget;
  expression: BlockExpression;
  locals?: FormulaLocal[];
  onClose: () => void;
  onApply: (expression: BlockExpression, locals?: FormulaLocal[] | null) => void;
}

export function FormulaCodeModal({
  open,
  title,
  config,
  target,
  expression,
  locals,
  onClose,
  onApply,
}: FormulaCodeModalProps) {
  const t = useTranslations("builder");
  const shortcuts = useEditorShortcutLabels();
  const [draft, setDraft] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setDraft(formatFormulaCodeBlock(expression, target, locals));
    setError(null);
  }, [open, expression, target, locals]);

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
    const parsed = tryParseFormulaProgram(draft, target);
    if (!parsed.ok) {
      setError(parsed.error);
      return;
    }
    const program = parsed.program;
    onApply(
      normalizeParsedExpression(program.expression),
      program.locals.length > 0
        ? program.locals.map((local) => ({
            id: local.id,
            expression: normalizeParsedExpression(local.expression),
          }))
        : null,
    );
    onClose();
  }

  function handleCancel() {
    setError(null);
    onClose();
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
                {t("codeModeFormulaHint")} · {shortcuts.summary}
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
              showToolbar
              onApplyShortcut={handleApply}
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
              onClick={handleCancel}
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
