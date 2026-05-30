"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { CodeSnippetPanel } from "@/app/components/builder/code-snippet-panel";
import {
  FormulaCodeEditor,
  type FormulaCodeEditorHandle,
} from "@/app/components/builder/formula-code-editor";
import { useEditorShortcutLabels } from "@/app/components/builder/use-editor-shortcut-labels";
import { DocsHelpLink } from "@/app/components/docs/docs-help-link";
import { usePersistedResize } from "@/lib/hooks/use-persisted-resize";
import { finalizeConfig } from "@/lib/calculator/config/sync";
import { formatScriptFileSource } from "@/lib/calculator/script/format-file";
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
  onPreviewConfig?: (config: CalculatorConfig | null) => void;
}

const SHEET_WIDTH_STORAGE_KEY = "config-code-sheet-width";
const PROBLEMS_WIDTH_STORAGE_KEY = "config-code-sheet-problems-width";
const SNIPPETS_HEIGHT_STORAGE_KEY = "config-code-sheet-snippets-height";
const DEFAULT_SHEET_WIDTH = 1024;
const MIN_SHEET_WIDTH = 640;
const MAX_SHEET_WIDTH = 1400;
const DEFAULT_PROBLEMS_WIDTH = 280;
const MIN_PROBLEMS_WIDTH = 200;
const MAX_PROBLEMS_WIDTH = 520;
const DEFAULT_SNIPPETS_HEIGHT = 240;
const MIN_SNIPPETS_HEIGHT = 120;
const MAX_SNIPPETS_HEIGHT = 480;

const SCRIPT_SNIPPET_FILES: ScriptProjectFileId[] = [
  SCRIPT_FILE_CALCULATIONS,
  SCRIPT_FILE_OUTPUTS,
];

function clampSheetWidth(value: number) {
  return Math.min(MAX_SHEET_WIDTH, Math.max(MIN_SHEET_WIDTH, value));
}

function clampProblemsWidth(value: number) {
  return Math.min(MAX_PROBLEMS_WIDTH, Math.max(MIN_PROBLEMS_WIDTH, value));
}

function clampSnippetsHeight(value: number) {
  return Math.min(MAX_SNIPPETS_HEIGHT, Math.max(MIN_SNIPPETS_HEIGHT, value));
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
  onPreviewConfig,
}: ConfigCodeSheetProps) {
  const t = useTranslations("builder");
  const shortcuts = useEditorShortcutLabels();
  const autoTotalSuffix = t("autoTotalSuffix");
  const editorRef = useRef<FormulaCodeEditorHandle>(null);
  const { size: sheetWidth, handleResizePointerDown: handleSheetResize } =
    usePersistedResize(
      SHEET_WIDTH_STORAGE_KEY,
      DEFAULT_SHEET_WIDTH,
      clampSheetWidth,
      "x",
    );
  const {
    size: problemsWidth,
    handleResizePointerDown: handleProblemsResize,
  } = usePersistedResize(
    PROBLEMS_WIDTH_STORAGE_KEY,
    DEFAULT_PROBLEMS_WIDTH,
    clampProblemsWidth,
    "x",
  );
  const {
    size: snippetsHeight,
    handleResizePointerDown: handleSnippetsResize,
  } = usePersistedResize(
    SNIPPETS_HEIGHT_STORAGE_KEY,
    DEFAULT_SNIPPETS_HEIGHT,
    clampSnippetsHeight,
    "y",
  );
  const [project, setProject] = useState<ScriptProject>(emptyProject);
  const [activeFile, setActiveFile] = useState<ScriptProjectFileId>(
    SCRIPT_FILE_INPUTS,
  );
  const [error, setError] = useState<string | null>(null);

  const parsePreview = useMemo(
    () => parseScriptProject(project, config),
    [project, config],
  );

  const fileErrors = useMemo(
    () => parsePreview.errors.filter((e) => !e.file || e.file === activeFile),
    [parsePreview.errors, activeFile],
  );

  const errorsByFile = useMemo(() => {
    const counts = new Map<ScriptProjectFileId, number>();
    for (const fileId of SCRIPT_PROJECT_FILES) {
      counts.set(fileId, 0);
    }
    for (const err of parsePreview.errors) {
      if (err.file && SCRIPT_PROJECT_FILES.includes(err.file as ScriptProjectFileId)) {
        const id = err.file as ScriptProjectFileId;
        counts.set(id, (counts.get(id) ?? 0) + 1);
      }
    }
    return counts;
  }, [parsePreview.errors]);

  useEffect(() => {
    if (!open) {
      onPreviewConfig?.(null);
      return;
    }
    setProject(formatScriptProject(finalizeConfig(config, autoTotalSuffix)));
    setActiveFile(SCRIPT_FILE_INPUTS);
    setError(null);
  }, [open, config, autoTotalSuffix, onPreviewConfig]);

  useEffect(() => {
    if (!open) {
      return;
    }

    const timer = setTimeout(() => {
      onPreviewConfig?.(
        parsePreview.errors.length === 0 && parsePreview.config
          ? parsePreview.config
          : null,
      );
    }, 250);

    return () => clearTimeout(timer);
  }, [open, parsePreview, onPreviewConfig]);

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
      if ((event.metaKey || event.ctrlKey) && event.key === "s") {
        event.preventDefault();
        handleApply();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose, project, activeFile]);

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
        editorRef.current?.goToLine(first.line);
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
    onPreviewConfig?.(null);
    onClose();
  }

  function handleCancel() {
    onPreviewConfig?.(null);
    onClose();
  }

  function updateActiveFile(value: string) {
    setProject((prev) => ({ ...prev, [activeFile]: value }));
    setError(null);
  }

  function handleFormatFile() {
    const { formatted, ok } = formatScriptFileSource(
      project[activeFile],
      activeFile,
    );
    if (ok) {
      setProject((prev) => ({ ...prev, [activeFile]: formatted }));
      setError(null);
    }
  }

  const readOnly = activeFile === SCRIPT_FILE_AUTO_CALCULATIONS;
  const showSnippetPanel =
    SCRIPT_SNIPPET_FILES.includes(activeFile) && !readOnly;

  function handleSnippetInsert(text: string) {
    editorRef.current?.insertAtCursor(text);
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
        style={{ width: `min(100%, ${sheetWidth}px)` }}
        className="fixed inset-y-0 right-0 z-50 flex max-w-full flex-col border-l border-border bg-card shadow-card-lg"
      >
        <div
          role="separator"
          aria-orientation="vertical"
          aria-label={t("codeEditorSheetResize")}
          onPointerDown={handleSheetResize}
          className="absolute inset-y-0 left-0 z-10 w-2 -translate-x-1/2 cursor-ew-resize touch-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border hover:before:bg-accent/60 active:before:bg-accent"
        />
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2">
              <h3
                id="config-code-sheet-title"
                className="text-base font-semibold text-foreground"
              >
                {t("codeModeSheetTitle")}
              </h3>
              <DocsHelpLink hash="input" />
            </div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {t("codeModeProjectHint")} · {shortcuts.summary}
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
          {SCRIPT_PROJECT_FILES.map((fileId) => {
            const errCount = errorsByFile.get(fileId) ?? 0;
            return (
              <button
                key={fileId}
                type="button"
                role="tab"
                aria-selected={activeFile === fileId}
                title={fileId}
                aria-label={`${t(TAB_LABEL_KEYS[fileId])} (${fileId})`}
                onClick={() => setActiveFile(fileId)}
                className={`relative shrink-0 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors ${
                  activeFile === fileId
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground hover:bg-muted hover:text-foreground"
                }`}
              >
                {t(TAB_LABEL_KEYS[fileId])}
                {errCount > 0 && (
                  <span className="ml-1.5 inline-flex min-w-[1.1rem] justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-white">
                    {errCount}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        <div className="flex min-h-0 flex-1">
          <div className="flex min-h-0 min-w-0 flex-1 flex-col px-4 py-3">
            <FormulaCodeEditor
              ref={editorRef}
              key={activeFile}
              value={project[activeFile]}
              onChange={updateActiveFile}
              config={config}
              target={{ fieldId: "__script__" }}
              scriptMode
              scriptProject={project}
              scriptFileId={activeFile}
              readOnly={readOnly}
              minHeight="min(70vh, 640px)"
              className="min-h-[min(70vh,640px)]"
              fileLabel={activeFile}
              showToolbar
              onFormat={readOnly ? undefined : handleFormatFile}
              onApplyShortcut={handleApply}
            />
            {readOnly && (
              <p className="mt-2 text-xs text-muted-foreground">
                {t("codeEditorAutoFileReadonly")}
              </p>
            )}
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </div>

          <div
            role="separator"
            aria-orientation="vertical"
            aria-label={t("codeEditorProblemsResize")}
            onPointerDown={handleProblemsResize}
            className="relative hidden w-2 shrink-0 cursor-ew-resize touch-none lg:block before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border hover:before:bg-accent/60 active:before:bg-accent"
          />
          <aside
            style={{ width: problemsWidth }}
            className="hidden min-h-0 shrink-0 flex-col border-l border-border bg-muted/20 lg:flex"
          >
            {showSnippetPanel ? (
              <>
                <div
                  style={{ height: snippetsHeight }}
                  className="flex min-h-0 shrink-0 flex-col border-b border-border"
                >
                  <CodeSnippetPanel
                    config={config}
                    onInsert={handleSnippetInsert}
                  />
                </div>
                <div
                  role="separator"
                  aria-orientation="horizontal"
                  aria-label={t("codeEditorSnippetsResize")}
                  onPointerDown={handleSnippetsResize}
                  className="relative h-2 shrink-0 cursor-ns-resize touch-none before:absolute before:inset-x-0 before:top-1/2 before:h-px before:-translate-y-1/2 before:bg-border hover:before:bg-accent/60 active:before:bg-accent"
                />
              </>
            ) : (
              <p className="shrink-0 border-b border-border px-3 py-2 text-[11px] leading-snug text-muted-foreground">
                {t("codeEditorSnippetsUnavailable")}
              </p>
            )}
            <div className="flex min-h-0 flex-1 flex-col">
              <p className="shrink-0 border-b border-border px-3 py-2 text-xs font-semibold text-muted-foreground">
                {t("codeEditorProblems")}
              </p>
              <ul className="min-h-0 flex-1 overflow-y-auto p-2 text-xs">
                {fileErrors.length === 0 ? (
                  <li className="px-2 py-1 text-muted-foreground">
                    {t("codeEditorNoProblems")}
                  </li>
                ) : (
                  fileErrors.map((err, index) => (
                    <li key={`${err.line}-${index}`}>
                      <button
                        type="button"
                        className="w-full rounded-lg px-2 py-1.5 text-left text-destructive hover:bg-destructive/10"
                        onClick={() => editorRef.current?.goToLine(err.line)}
                      >
                        <span className="font-mono text-muted-foreground">
                          {err.line}:
                        </span>{" "}
                        {err.message}
                      </button>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </aside>
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
