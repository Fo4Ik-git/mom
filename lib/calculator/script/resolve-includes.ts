import type { ScriptDeclaration } from "@/lib/calculator/schema/_definition";
import type { ScriptParseError } from "@/lib/calculator/script/parse";
import { parseScriptFile } from "@/lib/calculator/script/parse-file";
import {
  SCRIPT_PROJECT_FILES,
  type ScriptProject,
  type ScriptProjectFileId,
} from "@/lib/calculator/script/project-types";

const INCLUDE_PATTERN = /^\s*#include\s+"([^"]+)"\s*(?:\/\/.*)?$/;
const MAX_INCLUDE_DEPTH = 8;

function isProjectFile(path: string): path is ScriptProjectFileId {
  return (SCRIPT_PROJECT_FILES as readonly string[]).includes(path);
}

function stripIncludeLines(source: string): string {
  return source
    .split("\n")
    .filter((line) => !INCLUDE_PATTERN.test(line))
    .join("\n");
}

export function collectIncludedPaths(source: string): ScriptProjectFileId[] {
  const paths: ScriptProjectFileId[] = [];
  for (const line of source.split("\n")) {
    const match = line.match(INCLUDE_PATTERN);
    if (match && isProjectFile(match[1]!.trim())) {
      paths.push(match[1]!.trim() as ScriptProjectFileId);
    }
  }
  return paths;
}

/** Files referenced by any #include — parsed only through their includer. */
export function collectAllIncludedPaths(project: ScriptProject): Set<ScriptProjectFileId> {
  const included = new Set<ScriptProjectFileId>();
  for (const fileId of SCRIPT_PROJECT_FILES) {
    for (const path of collectIncludedPaths(project[fileId] ?? "")) {
      included.add(path);
    }
  }
  return included;
}

/** Validate include graph before parsing (cycles, unknown paths). */
export function validateIncludeGraph(project: ScriptProject): ScriptParseError[] {
  const errors: ScriptParseError[] = [];
  const visiting = new Set<ScriptProjectFileId>();
  const visited = new Set<ScriptProjectFileId>();

  function visit(fileId: ScriptProjectFileId, stack: ScriptProjectFileId[]) {
    if (stack.includes(fileId)) {
      errors.push({
        file: stack[stack.length - 1] ?? fileId,
        line: 1,
        message: `Include cycle: ${[...stack, fileId].join(" → ")}`,
      });
      return;
    }
    if (visited.has(fileId)) {
      return;
    }
    if (visiting.has(fileId)) {
      return;
    }

    visiting.add(fileId);
    for (const includePath of collectIncludedPaths(project[fileId] ?? "")) {
      if (!isProjectFile(includePath)) {
        errors.push({
          file: fileId,
          line: 1,
          message: `Unknown include path "${includePath}"`,
        });
        continue;
      }
      visit(includePath, [...stack, fileId]);
    }
    visiting.delete(fileId);
    visited.add(fileId);
  }

  for (const fileId of SCRIPT_PROJECT_FILES) {
    visit(fileId, []);
  }

  return errors;
}

function parseFileOnce(
  fileId: ScriptProjectFileId,
  project: ScriptProject,
  memo: Map<ScriptProjectFileId, ScriptDeclaration[]>,
  errors: ScriptParseError[],
): ScriptDeclaration[] {
  const cached = memo.get(fileId);
  if (cached) {
    return cached;
  }

  const parsed = parseScriptFile(stripIncludeLines(project[fileId] ?? ""), fileId);
  errors.push(...parsed.errors);
  memo.set(fileId, parsed.declarations);
  return parsed.declarations;
}

function appendIncludedDeclarations(
  fileId: ScriptProjectFileId,
  project: ScriptProject,
  memo: Map<ScriptProjectFileId, ScriptDeclaration[]>,
  mergedFiles: Set<ScriptProjectFileId>,
  stack: ScriptProjectFileId[],
  errors: ScriptParseError[],
  out: ScriptDeclaration[],
) {
  if (stack.includes(fileId)) {
    errors.push({
      file: stack[stack.length - 1] ?? fileId,
      line: 1,
      message: `Include cycle: ${[...stack, fileId].join(" → ")}`,
    });
    return;
  }

  if (stack.length >= MAX_INCLUDE_DEPTH) {
    errors.push({
      file: fileId,
      line: 1,
      message: `Include depth limit (${MAX_INCLUDE_DEPTH}) exceeded`,
    });
    return;
  }

  if (mergedFiles.has(fileId)) {
    return;
  }
  mergedFiles.add(fileId);

  const source = project[fileId] ?? "";
  for (const includePath of collectIncludedPaths(source)) {
    if (!isProjectFile(includePath)) {
      errors.push({
        file: fileId,
        line: 1,
        message: `Unknown include path "${includePath}"`,
      });
      continue;
    }
    appendIncludedDeclarations(
      includePath,
      project,
      memo,
      mergedFiles,
      [...stack, fileId],
      errors,
      out,
    );
  }

  out.push(...parseFileOnce(fileId, project, memo, errors));
}

/** Declarations for one project file, merging each included file at most once globally. */
export function parseProjectFileWithIncludes(
  fileId: ScriptProjectFileId,
  project: ScriptProject,
  memo: Map<ScriptProjectFileId, ScriptDeclaration[]>,
  mergedFiles: Set<ScriptProjectFileId>,
  errors: ScriptParseError[],
): ScriptDeclaration[] {
  const declarations: ScriptDeclaration[] = [];
  const source = project[fileId] ?? "";
  const includes = collectIncludedPaths(source);

  for (const includePath of includes) {
    if (!isProjectFile(includePath)) {
      errors.push({
        file: fileId,
        line: 1,
        message: `Unknown include path "${includePath}"`,
      });
      continue;
    }
    appendIncludedDeclarations(
      includePath,
      project,
      memo,
      mergedFiles,
      [fileId],
      errors,
      declarations,
    );
  }

  declarations.push(...parseFileOnce(fileId, project, memo, errors));
  return declarations;
}

/** Expand #include as comments for editor preview (optional). */
export function expandIncludesForDisplay(source: string): string {
  return source.replace(INCLUDE_PATTERN, (_match, path) => {
    return `// #include "${path}"`;
  });
}
