"use client";

import { useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { FormulaScratchEditor } from "@/app/components/builder/scratch/formula-scratch-editor";
import { FormulaCodeEditor } from "@/app/components/builder/formula-code-editor";
import type { FormulaTarget } from "@/lib/formula/core/formula-target";
import {
  formulaFieldFromCode,
  formulaFieldToCode,
  serializeFormulaField,
  type FormulaFieldSnapshot,
} from "@/lib/formula/sync/formula-field-sync";
import type { BlockExpression, CalculatorConfig, FormulaLocal } from "@/types/calculator";

type ViewMode = "both" | "code" | "blocks";

interface FormulaUnifiedEditorProps {
  config: CalculatorConfig;
  formulaTarget: FormulaTarget;
  fieldKey: string;
  fieldLabel?: string;
  expression: BlockExpression;
  locals?: FormulaLocal[];
  onChange: (
    expression: BlockExpression,
    locals?: FormulaLocal[] | null,
  ) => void;
  codeReadOnly?: boolean;
}

const CODE_SYNC_DEBOUNCE_MS = 400;

export function FormulaUnifiedEditor({
  config,
  formulaTarget,
  fieldKey,
  expression,
  locals,
  onChange,
  codeReadOnly = false,
}: FormulaUnifiedEditorProps) {
  const t = useTranslations("builder");
  const [viewMode, setViewMode] = useState<ViewMode>("both");
  const [codeText, setCodeText] = useState("");
  const [codeError, setCodeError] = useState<string | null>(null);

  const snapshotRef = useRef(
    serializeFormulaField({ expression, locals }),
  );
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const serialized = serializeFormulaField({ expression, locals });
    if (serialized === snapshotRef.current) {
      return;
    }
    snapshotRef.current = serialized;
    setCodeText(formulaFieldToCode({ expression, locals }, formulaTarget));
    setCodeError(null);
  }, [expression, locals, formulaTarget]);

  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  function scheduleCodeSync(nextSource: string) {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      const parsed = formulaFieldFromCode(nextSource, formulaTarget);
      if (!parsed.ok) {
        setCodeError(parsed.error);
        return;
      }
      setCodeError(null);
      const serialized = serializeFormulaField(parsed.snapshot);
      if (serialized === snapshotRef.current) {
        return;
      }
      snapshotRef.current = serialized;
      onChange(
        parsed.snapshot.expression,
        parsed.snapshot.locals === undefined
          ? null
          : parsed.snapshot.locals,
      );
    }, CODE_SYNC_DEBOUNCE_MS);
  }

  function handleBlocksChange(next: BlockExpression) {
    const snapshot: FormulaFieldSnapshot = { expression: next, locals };
    const serialized = serializeFormulaField(snapshot);
    snapshotRef.current = serialized;
    setCodeText(formulaFieldToCode(snapshot, formulaTarget));
    setCodeError(null);
    onChange(next, locals);
  }

  return (
    <div className="space-y-3">
      <div
        className="flex flex-wrap gap-1 rounded-lg border border-border bg-muted/30 p-1"
        role="tablist"
        aria-label={t("formulaViewModeLabel")}
      >
        {(
          [
            ["both", t("formulaViewBoth")],
            ["code", t("formulaViewCode")],
            ["blocks", t("formulaViewBlocks")],
          ] as const
        ).map(([mode, label]) => (
          <button
            key={mode}
            type="button"
            role="tab"
            aria-selected={viewMode === mode}
            onClick={() => setViewMode(mode)}
            className={`rounded-md px-2.5 py-1 text-xs font-medium transition ${
              viewMode === mode
                ? "bg-card text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      <p className="text-[11px] leading-snug text-muted-foreground">
        {t("formulaUnifiedHint")}
      </p>

      {(viewMode === "both" || viewMode === "code") && (
        <div className="space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {t("formulaCodePanel")}
          </span>
          <FormulaCodeEditor
            value={codeText}
            onChange={(next) => {
              setCodeText(next);
              if (!codeReadOnly) {
                scheduleCodeSync(next);
              }
            }}
            config={config}
            target={formulaTarget}
            minHeight={viewMode === "code" ? "280px" : "160px"}
            readOnly={codeReadOnly}
          />
          {codeError && (
            <p className="text-xs text-destructive">{codeError}</p>
          )}
        </div>
      )}

      {(viewMode === "both" || viewMode === "blocks") && (
        <div className="space-y-1.5">
          {viewMode === "both" && (
            <span className="text-xs font-medium text-muted-foreground">
              {t("formulaBlocksPanel")}
            </span>
          )}
          <FormulaScratchEditor
            config={config}
            formulaTarget={formulaTarget}
            outputKey={fieldKey}
            expression={expression}
            onChange={handleBlocksChange}
          />
        </div>
      )}
    </div>
  );
}
