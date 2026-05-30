import type { ScriptParseError } from "@/lib/calculator/script/parse";
import {
  SCRIPT_PROJECT_FILES,
  type ScriptProject,
  type ScriptProjectFileId,
} from "@/lib/calculator/script/project-types";
import { getCalculatorTemplate } from "@/lib/calculator/script/templates";

const USE_PATTERN = /^\s*#use\s+"([^"]+)"\s*(?:\/\/.*)?$/;

export function collectUsePaths(source: string): string[] {
  const paths: string[] = [];
  for (const line of source.split("\n")) {
    const match = line.match(USE_PATTERN);
    if (match) {
      paths.push(match[1]!.trim());
    }
  }
  return paths;
}

export function stripUseLines(source: string): string {
  return source
    .split("\n")
    .filter((line) => !USE_PATTERN.test(line))
    .join("\n");
}

/** Collect unique template ids referenced anywhere in the project. */
export function collectProjectUsePaths(project: ScriptProject): string[] {
  const ids = new Set<string>();
  for (const fileId of SCRIPT_PROJECT_FILES) {
    for (const path of collectUsePaths(project[fileId] ?? "")) {
      ids.add(path);
    }
  }
  return [...ids];
}

function appendFileContent(base: string, extra: string): string {
  const left = base.trim();
  const right = extra.trim();
  if (!right) {
    return left;
  }
  if (!left) {
    return right;
  }
  return `${left}\n\n${right}`;
}

/** Merge built-in template project with user sources; strip `#use` directives. */
export function applyTemplateUses(
  project: ScriptProject,
): { project: ScriptProject; errors: ScriptParseError[] } {
  const useIds = collectProjectUsePaths(project);
  if (useIds.length === 0) {
    return { project, errors: [] };
  }

  if (useIds.length > 1) {
    return {
      project,
      errors: [
        {
          file: SCRIPT_PROJECT_FILES[0],
          line: 1,
          message: `Only one #use template per project (found: ${useIds.join(", ")})`,
        },
      ],
    };
  }

  const template = getCalculatorTemplate(useIds[0]!);
  if (!template) {
    return {
      project,
      errors: [
        {
          file: SCRIPT_PROJECT_FILES[0],
          line: 1,
          message: `Unknown template "${useIds[0]}"`,
        },
      ],
    };
  }

  const merged = { ...template.project } satisfies ScriptProject;

  for (const fileId of SCRIPT_PROJECT_FILES) {
    const userPart = stripUseLines(project[fileId] ?? "").trim();
    if (userPart) {
      merged[fileId] = appendFileContent(merged[fileId] ?? "", userPart);
    }
  }

  return { project: merged, errors: [] };
}

/** Expand `#use` as comments for editor preview (optional). */
export function expandUsesForDisplay(source: string): string {
  return source.replace(USE_PATTERN, (_match, path) => {
    return `// #use "${path}"`;
  });
}
