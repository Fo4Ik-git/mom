import { isAutoCalculationId } from "@/lib/calculator/config/auto-calculations";
import { formatDeclaration } from "@/lib/calculator/script/format";
import {
  SCRIPT_FILE_AUTO_CALCULATIONS,
  SCRIPT_FILE_CALCULATIONS,
  SCRIPT_FILE_CONSTANTS,
  SCRIPT_FILE_INPUTS,
  SCRIPT_FILE_OUTPUTS,
  type ScriptProject,
  type ScriptProjectFileId,
} from "@/lib/calculator/script/project-types";
import type { CalculatorConfig } from "@/types/calculator";

const FILE_HEADERS: Record<ScriptProjectFileId, string> = {
  [SCRIPT_FILE_INPUTS]: "// Input fields — поля для вводу користувача",
  [SCRIPT_FILE_CONSTANTS]: "// Constants — фіксовані значення",
  [SCRIPT_FILE_AUTO_CALCULATIONS]:
    "// Auto-calculations — qty × property (autoTotal); можна змінити формулу",
  [SCRIPT_FILE_CALCULATIONS]: "// Calculations — проміжні формули",
  [SCRIPT_FILE_OUTPUTS]: "// Outputs — результати",
};

function joinSection(lines: string[]): string {
  if (lines.length === 0) {
    return "";
  }
  return lines.join("\n\n");
}

export function formatScriptProject(config: CalculatorConfig): ScriptProject {
  const inputLines = config.inputs.map((input) =>
    formatDeclaration({ kind: "input", data: input }),
  );

  const constantLines = (config.constants ?? []).map((constant) =>
    formatDeclaration({ kind: "constant", data: constant }),
  );

  const autoCalculationLines = (config.calculations ?? [])
    .filter((calc) => isAutoCalculationId(calc.id))
    .map((calc) =>
      formatDeclaration(
        { kind: "calculation", data: calc },
        { includeAutoCalculations: true },
      ),
    );

  const calculationLines = (config.calculations ?? [])
    .filter((calc) => !isAutoCalculationId(calc.id))
    .map((calc) => formatDeclaration({ kind: "calculation", data: calc }));

  const outputLines = config.outputs.map((output) =>
    formatDeclaration({ kind: "output", data: output }),
  );

  return {
    [SCRIPT_FILE_INPUTS]: sectionText(SCRIPT_FILE_INPUTS, inputLines),
    [SCRIPT_FILE_CONSTANTS]: sectionText(SCRIPT_FILE_CONSTANTS, constantLines),
    [SCRIPT_FILE_AUTO_CALCULATIONS]: sectionText(
      SCRIPT_FILE_AUTO_CALCULATIONS,
      autoCalculationLines,
    ),
    [SCRIPT_FILE_CALCULATIONS]: sectionText(
      SCRIPT_FILE_CALCULATIONS,
      calculationLines,
    ),
    [SCRIPT_FILE_OUTPUTS]: sectionText(SCRIPT_FILE_OUTPUTS, outputLines),
  };
}

function sectionText(fileId: ScriptProjectFileId, lines: string[]): string {
  const body = joinSection(lines);
  if (!body) {
    return `${FILE_HEADERS[fileId]}\n`;
  }
  return `${FILE_HEADERS[fileId]}\n\n${body}`;
}

export function scriptProjectToMonolith(project: ScriptProject): string {
  return [
    project[SCRIPT_FILE_INPUTS].trimEnd(),
    project[SCRIPT_FILE_CONSTANTS].trimEnd(),
    project[SCRIPT_FILE_AUTO_CALCULATIONS].trimEnd(),
    project[SCRIPT_FILE_CALCULATIONS].trimEnd(),
    project[SCRIPT_FILE_OUTPUTS].trimEnd(),
  ]
    .filter((part) => part.replace(/^\/\/[^\n]*\n?/gm, "").trim())
    .join("\n\n");
}
