"use client";

import { autocompletion } from "@codemirror/autocomplete";
import { defaultKeymap, history, indentWithTab } from "@codemirror/commands";
import {
  bracketMatching,
  foldGutter,
  indentOnInput,
} from "@codemirror/language";
import { linter, type Diagnostic } from "@codemirror/lint";
import { searchKeymap, highlightSelectionMatches } from "@codemirror/search";
import { type Extension } from "@codemirror/state";
import { EditorView, keymap, lineNumbers } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { useTheme } from "next-themes";
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { CodeEditorToolbar } from "@/app/components/builder/code-editor-toolbar";
import { useEditorShortcutLabels } from "@/app/components/builder/use-editor-shortcut-labels";
import {
  codeEditorCompletionKeymap,
  codeEditorHistoryKeymap,
} from "@/lib/calculator/editor/code-editor-keymap";
import { parseCalculatorScript } from "@/lib/calculator/script/parse";
import { parseScriptFile } from "@/lib/calculator/script/parse-file";
import {
  partialConfigFromProject,
  parseScriptProject,
} from "@/lib/calculator/script/parse-project";
import type {
  ScriptProject,
  ScriptProjectFileId,
} from "@/lib/calculator/script/project-types";
import {
  calculatorScriptHighlight,
  calculatorScriptLanguage,
} from "@/lib/calculator/script/calc-script-language";
import {
  buildFormulaCompletions,
  filterCompletions,
} from "@/lib/formula/code/formula-code-completions";
import { tryParseFormulaProgram } from "@/lib/formula/code/formula-program";
import type { FormulaTarget } from "@/lib/formula/core/formula-target";
import type { CalculatorConfig } from "@/types/calculator";

export type FormulaCodeEditorHandle = {
  focus: () => void;
  openSearch: () => void;
  goToLine: (line: number) => void;
  insertAtCursor: (text: string) => void;
  getDiagnostics: () => Diagnostic[];
};

function lineOffset(source: string, lineNumber: number): number {
  const lines = source.split("\n");
  let offset = 0;
  for (let i = 0; i < lineNumber - 1 && i < lines.length; i += 1) {
    offset += (lines[i]?.length ?? 0) + 1;
  }
  return offset;
}

function buildCompletionApply(insertText: string) {
  const cursorMarker = "$0";
  if (!insertText.includes(cursorMarker)) {
    return insertText;
  }

  const text = insertText.replaceAll(cursorMarker, "");
  const cursorOffset = insertText.indexOf(cursorMarker);

  return (
    view: EditorView,
    _completion: unknown,
    from: number,
    to: number,
  ) => {
    view.dispatch({
      changes: { from, to, insert: text },
      selection: { anchor: from + cursorOffset },
    });
  };
}

function createFormulaLinter(
  config: CalculatorConfig,
  target: FormulaTarget,
  scriptMode: boolean,
  scriptProject?: ScriptProject,
  scriptFileId?: ScriptProjectFileId,
) {
  return linter((view) => {
    const source = view.state.doc.toString();
    const diagnostics: Diagnostic[] = [];

    if (scriptMode && scriptProject && scriptFileId) {
      const fileResult = parseScriptFile(source, scriptFileId);
      for (const error of fileResult.errors) {
        const from = lineOffset(source, error.line);
        diagnostics.push({
          from,
          to: Math.min(from + 1, source.length),
          severity: "error",
          message: error.message,
        });
      }

      const projectWithCurrent = {
        ...scriptProject,
        [scriptFileId]: source,
      };
      const projectResult = parseScriptProject(projectWithCurrent, config);
      for (const error of projectResult.errors) {
        if (error.file && error.file !== scriptFileId) {
          continue;
        }
        const from = lineOffset(source, error.line);
        diagnostics.push({
          from,
          to: Math.min(from + 1, source.length),
          severity: "error",
          message: error.file ? `${error.file}: ${error.message}` : error.message,
        });
      }
      return diagnostics;
    }

    if (scriptMode) {
      const result = parseCalculatorScript(source, config);
      for (const error of result.errors) {
        const from = lineOffset(source, error.line);
        diagnostics.push({
          from,
          to: Math.min(from + 1, source.length),
          severity: "error",
          message: error.message,
        });
      }
      return diagnostics;
    }

    const parsed = tryParseFormulaProgram(source, target);
    if (!parsed.ok) {
      diagnostics.push({
        from: parsed.offset,
        to: Math.min(parsed.offset + 1, source.length),
        severity: "error",
        message: parsed.error,
      });
    }

    return diagnostics;
  });
}

function createCompletionExtension(
  config: CalculatorConfig,
  target: FormulaTarget,
  scriptMode: boolean,
  scriptProject?: ScriptProject,
  scriptFileId?: ScriptProjectFileId,
) {
  return autocompletion({
    activateOnTyping: true,
    defaultKeymap: false,
    icons: true,
    override: [
      (context) => {
        const word =
          context.matchBefore(/[a-zA-Z0-9_."]*/) ??
          (context.explicit
            ? { from: context.pos, to: context.pos, text: "" }
            : null);
        if (!word || (word.from === word.to && !context.explicit)) {
          return null;
        }

        const completionConfig =
          scriptMode && scriptProject && scriptFileId
            ? partialConfigFromProject(
                { ...scriptProject, [scriptFileId]: context.state.doc.toString() },
                config,
              )
            : config;

        const items = filterCompletions(
          buildFormulaCompletions(completionConfig, target, {
            scriptMode,
            scriptSource: context.state.doc.toString(),
            scriptPos: context.pos,
            scriptFileId,
          }),
          word.text,
        );

        if (items.length === 0) {
          return null;
        }

        return {
          from: word.from,
          options: items.map((item) => ({
            label: item.label,
            detail: item.detail,
            type: item.type,
            apply: buildCompletionApply(item.insertText),
          })),
        };
      },
    ],
  });
}

interface FormulaCodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  config: CalculatorConfig;
  target: FormulaTarget;
  scriptMode?: boolean;
  scriptProject?: ScriptProject;
  scriptFileId?: ScriptProjectFileId;
  readOnly?: boolean;
  minHeight?: string;
  className?: string;
  fileLabel?: string;
  showToolbar?: boolean;
  onFormat?: () => void;
  onApplyShortcut?: () => void;
}

export const FormulaCodeEditor = forwardRef<
  FormulaCodeEditorHandle,
  FormulaCodeEditorProps
>(function FormulaCodeEditor(
  {
    value,
    onChange,
    config,
    target,
    scriptMode = false,
    scriptProject,
    scriptFileId,
    readOnly = false,
    minHeight = "220px",
    className = "",
    fileLabel,
    showToolbar = false,
    onFormat,
    onApplyShortcut,
  },
  ref,
) {
  const { resolvedTheme } = useTheme();
  const shortcuts = useEditorShortcutLabels();
  const viewRef = useRef<EditorView | null>(null);
  const [cursor, setCursor] = useState({ line: 1, column: 1 });
  const [errorCount, setErrorCount] = useState(0);

  const linterExtension = useMemo(
    () =>
      createFormulaLinter(
        config,
        target,
        scriptMode,
        scriptProject,
        scriptFileId,
      ),
    [config, target, scriptMode, scriptProject, scriptFileId],
  );

  const extensions = useMemo((): Extension[] => {
    const applyBinding = onApplyShortcut
      ? keymap.of([
          {
            key: "Mod-Enter",
            run: () => {
              onApplyShortcut();
              return true;
            },
          },
        ])
      : [];

    return [
      calculatorScriptLanguage,
      calculatorScriptHighlight,
      lineNumbers(),
      bracketMatching(),
      indentOnInput(),
      foldGutter(),
      highlightSelectionMatches(),
      history(),
      EditorView.lineWrapping,
      EditorView.contentAttributes.of({
        spellcheck: "false",
        autocapitalize: "off",
        autocomplete: "off",
      }),
      EditorView.theme({
        "&": { fontSize: "13px" },
        ".cm-content": { fontFamily: "ui-monospace, monospace" },
        ".cm-gutters": { fontFamily: "ui-monospace, monospace" },
      }),
      createCompletionExtension(
        config,
        target,
        scriptMode,
        scriptProject,
        scriptFileId,
      ),
      codeEditorHistoryKeymap,
      codeEditorCompletionKeymap,
      linterExtension,
      applyBinding,
      keymap.of([...defaultKeymap, ...searchKeymap, indentWithTab]),
      EditorView.updateListener.of((update) => {
        if (update.selectionSet || update.docChanged) {
          const pos = update.state.selection.main.head;
          const lineInfo = update.state.doc.lineAt(pos);
          setCursor({
            line: lineInfo.number,
            column: pos - lineInfo.from + 1,
          });
        }
        if (update.docChanged || update.selectionSet) {
          const source = update.state.doc.toString();
          if (scriptMode && scriptFileId) {
            setErrorCount(parseScriptFile(source, scriptFileId).errors.length);
          } else if (!scriptMode) {
            const parsed = tryParseFormulaProgram(source, target);
            setErrorCount(parsed.ok ? 0 : 1);
          }
        }
      }),
    ];
  }, [
    config,
    target,
    scriptMode,
    scriptProject,
    scriptFileId,
    linterExtension,
    onApplyShortcut,
  ]);

  const handleCreateEditor = useCallback((view: EditorView) => {
    viewRef.current = view;
  }, []);

  useImperativeHandle(ref, () => ({
    focus: () => viewRef.current?.focus(),
    openSearch: () => {
      const view = viewRef.current;
      if (!view) {
        return;
      }
      import("@codemirror/search").then(({ openSearchPanel }) => {
        openSearchPanel(view);
      });
    },
    goToLine: (line: number) => {
      const view = viewRef.current;
      if (!view || line < 1) {
        return;
      }
      const doc = view.state.doc;
      const lineNumber = Math.min(line, doc.lines);
      const lineInfo = doc.line(lineNumber);
      view.dispatch({
        selection: { anchor: lineInfo.from },
        effects: EditorView.scrollIntoView(lineInfo.from, { y: "center" }),
      });
      view.focus();
    },
    insertAtCursor: (text: string) => {
      const view = viewRef.current;
      if (!view || !text) {
        return;
      }
      const { from, to } = view.state.selection.main;
      view.dispatch({
        changes: { from, to, insert: text },
        selection: { anchor: from + text.length },
      });
      onChange(view.state.doc.toString());
      view.focus();
    },
    getDiagnostics: () => {
      const view = viewRef.current;
      if (!view) {
        return [];
      }
      const source = view.state.doc.toString();
      if (scriptMode && scriptProject && scriptFileId) {
        return parseScriptFile(source, scriptFileId).errors.map((error) => ({
          from: lineOffset(source, error.line),
          to: lineOffset(source, error.line) + 1,
          severity: "error" as const,
          message: error.message,
        }));
      }
      return [];
    },
  }));

  return (
    <div className={className}>
      {showToolbar && (
        <CodeEditorToolbar
          fileLabel={fileLabel}
          line={cursor.line}
          column={cursor.column}
          errorCount={errorCount}
          readOnly={readOnly}
          shortcutLabels={shortcuts}
          onFormat={onFormat}
          onFind={() => {
            import("@codemirror/search").then(({ openSearchPanel }) => {
              if (viewRef.current) {
                openSearchPanel(viewRef.current);
              }
            });
          }}
          onApply={onApplyShortcut}
        />
      )}
      <CodeMirror
        value={value}
        height={minHeight}
        theme={resolvedTheme === "dark" ? vscodeDark : vscodeLight}
        readOnly={readOnly}
        className={`overflow-hidden rounded-xl border border-border text-sm ${showToolbar ? "rounded-t-none" : ""}`}
        basicSetup={false}
        extensions={extensions}
        onChange={onChange}
        onCreateEditor={handleCreateEditor}
      />
    </div>
  );
});

FormulaCodeEditor.displayName = "FormulaCodeEditor";
