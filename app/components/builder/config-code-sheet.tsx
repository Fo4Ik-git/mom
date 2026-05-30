"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { FormulaCodeEditor } from "@/app/components/builder/formula-code-editor";
import { finalizeConfig } from "@/lib/calculator/config-sync";
import { formatScriptProject } from "@/lib/calculator/script/format-project";
import { parseScriptProject } from "@/lib/calculator/script/parse-project";
import {
  SCRIPT_FILE_AUTO_CALCULATIONS,
  SCRIPT_FILE_CALCULATIONS,
  SCRIPT_FILE_CONSTANTS,
  SCRIPT_FILE_INPUTS,
  SCRIPT_FILE_OUTPUTS,
  SCRIPT_PROJECT_FILES,
  type ScriptProject,
  type ScriptProjectFileId,
} from "@/lib/calculator/script/project-types";
import type { CalculatorConfig } from "@/types/calculator";

interface ConfigCodeSheetProps {
  open: boolean;
  config: CalculatorConfig;
  onClose: () => void;
  onApply: (config: CalculatorConfig) => void;
}

const TAB_LABEL_KEYS: Record<ScriptProjectFileId, string> = {
  [SCRIPT_FILE_INPUTS]: "codeModeTabInputs",
  [SCRIPT_FILE_CONSTANTS]: "codeModeTabConstants",
  [SCRIPT_FILE_AUTO_CALCULATIONS]: "codeModeTabAutoCalculations",
  [SCRIPT_FILE_CALCULATIONS]: "codeModeTabCalculations",
  [SCRIPT_FILE_OUTPUTS]: "codeModeTabOutputs",
};

function emptyProject(): ScriptProject {
  return {
    [SCRIPT_FILE_INPUTS]: "",
    [SCRIPT_FILE_CONSTANTS]: "",
    [SCRIPT_FILE_AUTO_CALCULATIONS]: "",
    [SCRIPT_FILE_CALCULATIONS]: "",
    [SCRIPT_FILE_OUTPUTS]: "",
  };
}

export function ConfigCodeSheet({
  open,
  config,
  onClose,
  onApply,
}: ConfigCodeSheetProps) {
  const t = useTranslations("builder");
  const autoTotalSuffix = t("autoTotalSuffix");
  const [project, setProject] = useState<ScriptProject>(emptyProject);
  const [activeFile, setActiveFile] = useState<ScriptProjectFileId>(
    SCRIPT_FILE_INPUTS,
  );
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    setProject(formatScriptProject(finalizeConfig(config, autoTotalSuffix)));
    setActiveFile(SCRIPT_FILE_INPUTS);
    setError(null);
  }, [open, config, autoTotalSuffix]);

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
    const result = parseScriptProject(project, config);
    if (result.errors.length > 0) {
      const first = result.errors[0]!;
      const location = first.file
        ? `${first.file}:${first.line}`
        : `Line ${first.line}`;
      setError(`${location}: ${first.message}`);
      if (first.file && SCRIPT_PROJECT_FILES.includes(first.file as ScriptProjectFileId)) {
        setActiveFile(first.file as ScriptProjectFileId);
      }
      return;
    }
    if (!result.config) {
      setError(t("codeModeScriptInvalid"));
      return;
    }
    if (result.project) {
      setProject(result.project);
    }
    onApply(result.config);
    onClose();
  }

  function handleCancel() {
    onClose();
  }

  function updateActiveFile(value: string) {
    setProject((prev) => ({ ...prev, [activeFile]: value }));
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
      <div
        role="dialog"
        aria-modal
        aria-labelledby="config-code-sheet-title"
        className="fixed inset-y-0 right-0 z-50 flex w-full max-w-3xl flex-col border-l border-border bg-card shadow-card-lg"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0">
            <h3
              id="config-code-sheet-title"
              className="text-base font-semibold text-foreground"
            >
              {t("codeModeSheetTitle")}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("codeModeProjectHint")}
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

        <div
          className="flex shrink-0 gap-1 overflow-x-auto border-b border-border px-4 py-2"
          role="tablist"
        >
          {SCRIPT_PROJECT_FILES.map((fileId) => (
            <button
              key={fileId}
              type="button"
              role="tab"
              aria-selected={activeFile === fileId}
              title={fileId}
              aria-label={`${t(TAB_LABEL_KEYS[fileId])} (${fileId})`}
              onClick={() => setActiveFile(fileId)}
              className={`shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                activeFile === fileId
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground"
              }`}
            >
              {t(TAB_LABEL_KEYS[fileId])}
            </button>
          ))}
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          <FormulaCodeEditor
            key={activeFile}
            value={project[activeFile]}
            onChange={updateActiveFile}
            config={config}
            target={{ fieldId: "__script__" }}
            scriptMode
            scriptProject={project}
            scriptFileId={activeFile}
            minHeight="calc(100vh - 220px)"
          />
          {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
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
    </>
  );
}
