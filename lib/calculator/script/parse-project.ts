import { finalizeConfig } from "@/lib/calculator/config/sync";
import {
  applyScriptIdRenamesToConfig,
  detectScriptIdRenames,
  hasScriptIdRenames,
  rewriteScriptProjectSources,
} from "@/lib/calculator/script/id-rename";
import { mergeScriptDeclarations } from "@/lib/calculator/script/merge-declarations";
import { parseScriptFile } from "@/lib/calculator/script/parse-file";
import type { ScriptParseResult } from "@/lib/calculator/script/parse";
import {
  collectAllIncludedPaths,
  parseProjectFileWithIncludes,
  validateIncludeGraph,
} from "@/lib/calculator/script/resolve-includes";
import { applyTemplateUses } from "@/lib/calculator/script/resolve-use";
import {
  FILE_PARSE_ORDER,
  type ScriptProject,
  type ScriptProjectFileId,
} from "@/lib/calculator/script/project-types";
import type { ScriptDeclaration } from "@/lib/calculator/schema/_definition";
import { calculatorConfigSchema, type CalculatorConfig } from "@/types/calculator";

function parseProjectEntries(
  project: ScriptProject,
): {
  entries: Array<{ file: ScriptProjectFileId; declarations: ScriptDeclaration[] }>;
  errors: ScriptParseResult["errors"];
} {
  const errors: ScriptParseResult["errors"] = validateIncludeGraph(project);
  if (errors.length > 0) {
    return { entries: [], errors };
  }
  const includedOnly = collectAllIncludedPaths(project);
  const memo = new Map<ScriptProjectFileId, ScriptDeclaration[]>();
  const mergedFiles = new Set<ScriptProjectFileId>();
  const entries: Array<{ file: ScriptProjectFileId; declarations: ScriptDeclaration[] }> =
    [];

  for (const fileId of FILE_PARSE_ORDER) {
    if (includedOnly.has(fileId)) {
      continue;
    }

    const source = project[fileId] ?? "";
    let declarations: ScriptDeclaration[];

    if (source.includes("#include")) {
      declarations = parseProjectFileWithIncludes(
        fileId,
        project,
        memo,
        mergedFiles,
        errors,
      );
    } else {
      const parsed = parseScriptFile(source, fileId);
      errors.push(...parsed.errors);
      declarations = parsed.declarations;
    }

    entries.push({ file: fileId, declarations });
  }

  return { entries, errors };
}

export function parseScriptProject(
  project: ScriptProject,
  baseConfig?: CalculatorConfig,
): ScriptParseResult {
  const { project: resolvedProject, errors: useErrors } = applyTemplateUses(project);
  if (useErrors.length > 0) {
    return { config: null, errors: useErrors };
  }

  const { entries, errors } = parseProjectEntries(resolvedProject);
  let totalDeclarations = 0;
  for (const entry of entries) {
    totalDeclarations += entry.declarations.length;
  }

  if (errors.length > 0) {
    return { config: null, errors };
  }

  if (totalDeclarations === 0) {
    return {
      config: null,
      errors: [{ message: "Project is empty", line: 1, file: FILE_PARSE_ORDER[0] }],
    };
  }

  const merged = mergeScriptDeclarations(entries, baseConfig);
  if (merged.errors.length > 0) {
    return { config: null, errors: merged.errors };
  }

  let config = merged.config;
  let nextProject: ScriptProject | undefined;

  if (baseConfig) {
    const renames = detectScriptIdRenames(baseConfig, config);
    if (hasScriptIdRenames(renames)) {
      config = applyScriptIdRenamesToConfig(config, renames);
      nextProject = rewriteScriptProjectSources(resolvedProject, renames);
    }
  }

  try {
    const parsed = calculatorConfigSchema.parse(config);
    return {
      config: finalizeConfig(parsed, "total"),
      errors: [],
      project: nextProject,
    };
  } catch (error) {
    return {
      config: null,
      errors: [
        {
          message:
            error instanceof Error ? error.message : "Invalid calculator config",
          line: 1,
          file: FILE_PARSE_ORDER[0],
        },
      ],
    };
  }
}

/** Partial config from project files for autocomplete in calc/output tabs. */
export function partialConfigFromProject(
  project: ScriptProject,
  baseConfig: CalculatorConfig,
): CalculatorConfig {
  const { project: resolvedProject, errors: useErrors } = applyTemplateUses(project);
  if (useErrors.length > 0) {
    return baseConfig;
  }
  const { entries, errors } = parseProjectEntries(resolvedProject);
  if (errors.length > 0) {
    return baseConfig;
  }
  return mergeScriptDeclarations(entries, baseConfig).config;
}
