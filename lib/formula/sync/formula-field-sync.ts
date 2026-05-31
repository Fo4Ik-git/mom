import { formatFormulaCodeBlock } from "@/lib/formula/code/code-format";
import { normalizeParsedExpression } from "@/lib/formula/code/code-parse";
import {
  tryParseFormulaProgram,
  type ParsedFormulaProgram,
} from "@/lib/formula/code/formula-program";
import type { FormulaTarget } from "@/lib/formula/core/formula-target";
import type { BlockExpression, FormulaLocal } from "@/types/calculator";

export type FormulaFieldSnapshot = {
  expression: BlockExpression;
  locals?: FormulaLocal[];
};

/** Serialize formula field AST for change detection (config is source of truth). */
export function serializeFormulaField(snapshot: FormulaFieldSnapshot): string {
  return JSON.stringify({
    expression: snapshot.expression,
    locals: snapshot.locals ?? [],
  });
}

/** AST → editable `formula { … }` text (code is a view, not stored separately). */
export function formulaFieldToCode(
  snapshot: FormulaFieldSnapshot,
  target: FormulaTarget,
): string {
  return formatFormulaCodeBlock(
    snapshot.expression,
    target,
    snapshot.locals,
  );
}

export type FormulaFieldParseResult =
  | { ok: true; snapshot: FormulaFieldSnapshot }
  | { ok: false; error: string };

/** Text → AST; same parser as Apply in code modal / script entities. */
export function formulaFieldFromCode(
  source: string,
  target: FormulaTarget,
): FormulaFieldParseResult {
  const parsed = tryParseFormulaProgram(source, target);
  if (!parsed.ok) {
    return { ok: false, error: parsed.error };
  }
  return { ok: true, snapshot: programToSnapshot(parsed.program) };
}

export function programToSnapshot(
  program: ParsedFormulaProgram,
): FormulaFieldSnapshot {
  return {
    expression: normalizeParsedExpression(program.expression),
    locals:
      program.locals.length > 0
        ? program.locals.map((local) => ({
            id: local.id,
            expression: normalizeParsedExpression(local.expression),
          }))
        : undefined,
  };
}
