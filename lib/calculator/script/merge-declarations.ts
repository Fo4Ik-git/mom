import type { ScriptDeclaration } from "@/lib/calculator/schema/_definition";
import type { ScriptParseError } from "@/lib/calculator/script/parse";
import type { ScriptProjectFileId } from "@/lib/calculator/script/project-types";
import type { CalculatorConfig } from "@/types/calculator";

function declarationId(decl: ScriptDeclaration): string {
  return decl.data.id;
}

export function mergeScriptDeclarations(
  entries: Array<{ file: ScriptProjectFileId; declarations: ScriptDeclaration[] }>,
  baseConfig?: CalculatorConfig,
): { config: CalculatorConfig; errors: ScriptParseError[] } {
  const errors: ScriptParseError[] = [];
  const seen = new Map<string, { file: ScriptProjectFileId; kind: string }>();

  const inputs: CalculatorConfig["inputs"] = [];
  const constants: NonNullable<CalculatorConfig["constants"]> = [];
  const macros: NonNullable<CalculatorConfig["macros"]> = [];
  const calculations: NonNullable<CalculatorConfig["calculations"]> = [];
  const outputs: CalculatorConfig["outputs"] = [];

  for (const { file, declarations } of entries) {
    for (const decl of declarations) {
      const id = declarationId(decl);
      const existing = seen.get(id);
      if (existing) {
        errors.push({
          file,
          line: 1,
          message: `Duplicate id "${id}" (already in ${existing.file})`,
        });
        continue;
      }
      seen.set(id, { file, kind: decl.kind });

      switch (decl.kind) {
        case "input":
          inputs.push(decl.data);
          break;
        case "constant":
          constants.push(decl.data);
          break;
        case "macro":
          macros.push(decl.data);
          break;
        case "calculation":
          calculations.push(decl.data);
          break;
        case "output":
          outputs.push(decl.data);
          break;
        default:
          break;
      }
    }
  }

  if (errors.length > 0) {
    return {
      config: {
        version: 2,
        inputs: baseConfig?.inputs ?? [],
        constants: baseConfig?.constants ?? [],
        macros: baseConfig?.macros ?? [],
        calculations: baseConfig?.calculations ?? [],
        outputs: baseConfig?.outputs ?? [],
      },
      errors,
    };
  }

  return {
    config: {
      version: 2,
      inputs: inputs.length > 0 ? inputs : (baseConfig?.inputs ?? []),
      constants:
        constants.length > 0 ? constants : (baseConfig?.constants ?? []),
      macros: macros.length > 0 ? macros : (baseConfig?.macros ?? []),
      calculations: calculations.length > 0
        ? calculations
        : (baseConfig?.calculations ?? []),
      outputs: outputs.length > 0 ? outputs : (baseConfig?.outputs ?? []),
    },
    errors: [],
  };
}
