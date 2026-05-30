"use client";

import { autocompletion } from "@codemirror/autocomplete";
import { linter, type Diagnostic } from "@codemirror/lint";
import { EditorView } from "@codemirror/view";
import CodeMirror from "@uiw/react-codemirror";
import { vscodeDark, vscodeLight } from "@uiw/codemirror-theme-vscode";
import { useTheme } from "next-themes";
import { useMemo } from "react";
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
  buildFormulaCompletions,
  filterCompletions,
} from "@/lib/formula/formula-code-completions";
import { tryParseFormulaCode } from "@/lib/formula/code-parse";
import type { FormulaTarget } from "@/lib/formula/formula-target";
import type { CalculatorConfig } from "@/types/calculator";

function lineOffset(source: string, lineNumber: number): number {
  const lines = source.split("\n");
  let offset = 0;
  for (let i = 0; i < lineNumber - 1 && i < lines.length; i += 1) {
    offset += (lines[i]?.length ?? 0) + 1;
  }
  return offset;
}

/** Insert completion text; places cursor inside `()` when snippet ends with `$0)`. */
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

    const parsed = tryParseFormulaCode(source, { target });
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
          buildFormulaCompletions(completionConfig, target, { scriptMode }),
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
}

export function FormulaCodeEditor({
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
}: FormulaCodeEditorProps) {
  const { resolvedTheme } = useTheme();

  const extensions = useMemo(
    () => [
      createCompletionExtension(
        config,
        target,
        scriptMode,
        scriptProject,
        scriptFileId,
      ),
      createFormulaLinter(
        config,
        target,
        scriptMode,
        scriptProject,
        scriptFileId,
      ),
      EditorView.lineWrapping,
    ],
    [config, target, scriptMode, scriptProject, scriptFileId],
  );

  return (
    <CodeMirror
      value={value}
      height={minHeight}
      theme={resolvedTheme === "dark" ? vscodeDark : vscodeLight}
      readOnly={readOnly}
      className={`overflow-hidden rounded-xl border border-border text-sm ${className}`}
      basicSetup={{
        lineNumbers: true,
        foldGutter: false,
        highlightActiveLine: true,
        autocompletion: false,
      }}
      extensions={extensions}
      onChange={onChange}
    />
  );
}
