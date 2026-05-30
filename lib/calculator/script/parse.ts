import { finalizeConfig } from "@/lib/calculator/config/sync";
import {
  applyScriptIdRenamesToConfig,
  detectScriptIdRenames,
  hasScriptIdRenames,
} from "@/lib/calculator/script/id-rename";
import { mergeScriptDeclarations } from "@/lib/calculator/script/merge-declarations";
import { parseScriptSource } from "@/lib/calculator/script/parse-source";
import {
  calculatorConfigSchema,
  type CalculatorConfig,
} from "@/types/calculator";

export interface ScriptParseError {
  message: string;
  line: number;
  file?: string;
}

export interface ScriptParseResult {
  config: CalculatorConfig | null;
  errors: ScriptParseError[];
  project?: import("@/lib/calculator/script/project-types").ScriptProject;
}

export function parseCalculatorScript(
  source: string,
  baseConfig?: CalculatorConfig,
): ScriptParseResult {
  const { declarations, errors } = parseScriptSource(source);

  if (errors.length > 0) {
    return { config: null, errors };
  }

  if (declarations.length === 0) {
    return {
      config: null,
      errors: [{ message: "Script is empty", line: 1 }],
    };
  }

  const merged = mergeScriptDeclarations(
    [{ file: "inputs.calc", declarations }],
    baseConfig,
  );

  if (merged.errors.length > 0) {
    return { config: null, errors: merged.errors };
  }

  let config = merged.config;
  if (baseConfig) {
    const renames = detectScriptIdRenames(baseConfig, config);
    if (hasScriptIdRenames(renames)) {
      config = applyScriptIdRenamesToConfig(config, renames);
    }
  }

  try {
    const parsed = calculatorConfigSchema.parse(config);
    return {
      config: finalizeConfig(parsed, "total"),
      errors: [],
    };
  } catch (error) {
    return {
      config: null,
      errors: [
        {
          message:
            error instanceof Error ? error.message : "Invalid calculator config",
          line: 1,
        },
      ],
    };
  }
}

export function tryParseCalculatorScript(
  source: string,
  baseConfig?: CalculatorConfig,
): ScriptParseResult {
  return parseCalculatorScript(source, baseConfig);
}
