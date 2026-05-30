import type { ScriptDeclaration } from "@/lib/calculator/schema/_definition";

export const SCRIPT_FILE_INPUTS = "inputs.calc" as const;
export const SCRIPT_FILE_CONSTANTS = "constants.calc" as const;
export const SCRIPT_FILE_AUTO_CALCULATIONS = "auto-calculations.calc" as const;
export const SCRIPT_FILE_CALCULATIONS = "calculations.calc" as const;
export const SCRIPT_FILE_OUTPUTS = "outputs.calc" as const;

export const SCRIPT_PROJECT_FILES = [
  SCRIPT_FILE_INPUTS,
  SCRIPT_FILE_CONSTANTS,
  SCRIPT_FILE_AUTO_CALCULATIONS,
  SCRIPT_FILE_CALCULATIONS,
  SCRIPT_FILE_OUTPUTS,
] as const;

export type ScriptProjectFileId = (typeof SCRIPT_PROJECT_FILES)[number];

export type ScriptProject = Record<ScriptProjectFileId, string>;

export const FILE_ALLOWED_KINDS: Record<
  ScriptProjectFileId,
  ScriptDeclaration["kind"][]
> = {
  [SCRIPT_FILE_INPUTS]: ["input"],
  [SCRIPT_FILE_CONSTANTS]: ["constant"],
  [SCRIPT_FILE_AUTO_CALCULATIONS]: ["calculation"],
  [SCRIPT_FILE_CALCULATIONS]: ["calculation"],
  [SCRIPT_FILE_OUTPUTS]: ["output"],
};

export const FILE_PARSE_ORDER: ScriptProjectFileId[] = [
  SCRIPT_FILE_INPUTS,
  SCRIPT_FILE_CONSTANTS,
  SCRIPT_FILE_AUTO_CALCULATIONS,
  SCRIPT_FILE_CALCULATIONS,
  SCRIPT_FILE_OUTPUTS,
];
