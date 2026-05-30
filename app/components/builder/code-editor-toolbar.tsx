"use client";

import { useTranslations } from "next-intl";
import type { getEditorShortcutLabels } from "@/lib/platform/editor-shortcut-labels";

export function CodeEditorToolbar({
  fileLabel,
  line,
  column,
  errorCount,
  readOnly,
  shortcutLabels,
  onFormat,
  onFind,
  onApply,
}: {
  fileLabel?: string;
  line: number;
  column: number;
  errorCount: number;
  readOnly?: boolean;
  shortcutLabels: ReturnType<typeof getEditorShortcutLabels>;
  onFormat?: () => void;
  onFind?: () => void;
  onApply?: () => void;
}) {
  const t = useTranslations("builder");

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-t-xl border border-b-0 border-border bg-muted/30 px-2 py-1.5">
      {fileLabel && (
        <span className="rounded-md bg-card px-2 py-0.5 font-mono text-xs text-muted-foreground">
          {fileLabel}
        </span>
      )}
      <span className="font-mono text-xs text-muted-foreground">
        {t("codeEditorLineCol", { line, column })}
      </span>
      {errorCount > 0 && (
        <span className="rounded-md bg-destructive/15 px-2 py-0.5 text-xs font-medium text-destructive">
          {t("codeEditorErrors", { count: errorCount })}
        </span>
      )}
      <div className="ml-auto flex flex-wrap gap-1">
        {!readOnly && onFormat && (
          <button
            type="button"
            onClick={onFormat}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            title={t("codeEditorFormatHint")}
          >
            {t("codeEditorFormat")}
          </button>
        )}
        {onFind && (
          <button
            type="button"
            onClick={onFind}
            className="rounded-lg px-2.5 py-1 text-xs font-medium text-foreground hover:bg-muted"
            title={shortcutLabels.findTitle}
          >
            {t("codeEditorFind")}
          </button>
        )}
        {onApply && (
          <button
            type="button"
            onClick={onApply}
            className="rounded-lg bg-accent px-2.5 py-1 text-xs font-semibold text-accent-foreground hover:opacity-90"
            title={shortcutLabels.applyTitle}
          >
            {t("codeModeApply")}
          </button>
        )}
      </div>
    </div>
  );
}
