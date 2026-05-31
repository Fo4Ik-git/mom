import type { CalculatorConfig } from "@/types/calculator";

/** Parsed declaration before merge into CalculatorConfig */
export type ScriptDeclaration =
  | { kind: "input"; data: CalculatorConfig["inputs"][number] }
  | { kind: "constant"; data: NonNullable<CalculatorConfig["constants"]>[number] }
  | {
      kind: "calculation";
      data: NonNullable<CalculatorConfig["calculations"]>[number];
    }
  | { kind: "macro"; data: NonNullable<CalculatorConfig["macros"]>[number] }
  | { kind: "output"; data: CalculatorConfig["outputs"][number] };

export interface ScriptFormatContext {
  /** Indent for nested blocks */
  indent?: string;
  /** Emit auto-calculation ids (auto-calculations.calc tab) */
  includeAutoCalculations?: boolean;
}

export interface ScriptParseContext {
  fileId?: import("@/lib/calculator/script/project-types").ScriptProjectFileId;
}

/** One autocomplete entry for script body / declaration syntax. */
export interface ScriptFieldCompletion {
  key: string;
  detail?: string;
  insertText: string;
}

export interface ScriptEntityCompletions {
  /** Insert when completing the entity keyword at file root */
  declarationSnippet: string;
  /** Keys valid inside `entity id { … }` */
  bodyFields: ScriptFieldCompletion[];
  /** Keys valid inside nested blocks, e.g. `property var_x { … }` */
  nestedBlocks?: Record<string, ScriptFieldCompletion[]>;
}

export interface ConfigEntityDefinition {
  /** Keyword in script: `input`, `constant`, `calc`, `output` */
  keyword: string;
  /** Human label for docs */
  label: string;
  /** Script editor autocomplete — derived from parse/format capabilities */
  scriptCompletions: ScriptEntityCompletions;
  format: (
    declaration: ScriptDeclaration,
    ctx: ScriptFormatContext,
  ) => string[];
  parseHeader: (
    line: string,
  ) => { id: string; label: string; flags: string[] } | null;
  parseBody: (
    body: string,
    header: { id: string; label: string; flags: string[] },
    ctx?: ScriptParseContext,
  ) => ScriptDeclaration | { error: string };
}

export interface BlockBodyLine {
  key: string;
  value: string;
  raw: string;
}
