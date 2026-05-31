import type { BlockExpression, FormulaLocal } from "@/types/calculator";
import type { FormulaTarget } from "@/lib/formula/core/formula-target";
import {
  FormulaParseError,
  parseFormulaCode,
  tryParseFormulaCode,
} from "@/lib/formula/code/code-parse";
import { formatFormulaCode } from "@/lib/formula/code/code-format";

export type ParsedFormulaProgram = {
  expression: BlockExpression;
  locals: FormulaLocal[];
};

const LOCAL_ID_PATTERN = /^[a-z][a-z0-9_]*$/;
const RESERVED_LOCAL_IDS = new Set([
  "local",
  "return",
  "if",
  "sum",
  "count",
  "avg",
  "min",
  "max",
  "row",
]);

export function isValidFormulaLocalId(id: string): boolean {
  if (!LOCAL_ID_PATTERN.test(id)) {
    return false;
  }
  if (
    id.startsWith("const_") ||
    id.startsWith("macro_") ||
    id.startsWith("calc_") ||
    id.startsWith("calculation_") ||
    id.startsWith("output_") ||
    id.startsWith("field_")
  ) {
    return false;
  }
  return !RESERVED_LOCAL_IDS.has(id);
}

function stripLineComments(source: string): string {
  return source
    .split("\n")
    .map((line) => {
      const idx = line.indexOf("//");
      return idx >= 0 ? line.slice(0, idx) : line;
    })
    .join("\n");
}

function splitFormulaLines(source: string): string[] {
  return stripLineComments(source)
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function parseExpressionWithLocals(
  source: string,
  target: FormulaTarget,
  localIds: ReadonlySet<string>,
  rowFieldId?: string,
): BlockExpression {
  try {
    return parseFormulaCode(source, { target, rowFieldId, localIds });
  } catch (error) {
    if (error instanceof FormulaParseError) {
      throw error;
    }
    throw new FormulaParseError("Invalid formula expression", 0);
  }
}

/** Parse `formula { … }` body — optional `local` lines + `return` expression. */
export function parseFormulaProgram(
  source: string,
  target: FormulaTarget,
  options?: { rowFieldId?: string },
): ParsedFormulaProgram {
  const trimmed = stripLineComments(source).trim();
  if (!trimmed) {
    return { expression: parseFormulaCode("", { target }), locals: [] };
  }

  const lines = splitFormulaLines(trimmed);
  const locals: FormulaLocal[] = [];
  const localIds = new Set<string>();
  let returnSource = "";
  let sawReturn = false;

  for (const line of lines) {
    const localMatch = line.match(/^local\s+([a-zA-Z_][a-zA-Z0-9_]*)\s*=\s*(.+)$/i);
    if (localMatch) {
      const id = localMatch[1]!.toLowerCase();
      const exprSource = localMatch[2]!.trim();
      if (!isValidFormulaLocalId(id)) {
        throw new FormulaParseError(`Invalid local variable name "${id}"`, 0);
      }
      if (localIds.has(id)) {
        throw new FormulaParseError(`Duplicate local variable "${id}"`, 0);
      }
      locals.push({
        id,
        expression: parseExpressionWithLocals(
          exprSource,
          target,
          localIds,
          options?.rowFieldId,
        ),
      });
      localIds.add(id);
      continue;
    }

    const returnMatch = line.match(/^return\s+(.+)$/i);
    if (returnMatch) {
      if (sawReturn) {
        throw new FormulaParseError("Only one return statement is allowed", 0);
      }
      sawReturn = true;
      returnSource = returnMatch[1]!.trim();
      continue;
    }

    if (locals.length === 0 && lines.length === 1) {
      returnSource = line.replace(/^return\s+/i, "").trim();
      sawReturn = true;
      continue;
    }

    throw new FormulaParseError(
      `Expected "local … =" or "return …", got: ${line}`,
      0,
    );
  }

  if (!sawReturn || !returnSource) {
    throw new FormulaParseError('Formula must end with "return …"', 0);
  }

  return {
    expression: parseExpressionWithLocals(
      returnSource,
      target,
      localIds,
      options?.rowFieldId,
    ),
    locals,
  };
}

export type ParseFormulaProgramResult =
  | { ok: true; program: ParsedFormulaProgram }
  | { ok: false; error: string; offset: number };

export function tryParseFormulaProgram(
  source: string,
  target: FormulaTarget,
  options?: { rowFieldId?: string },
): ParseFormulaProgramResult {
  try {
    return { ok: true, program: parseFormulaProgram(source, target, options) };
  } catch (error) {
    if (error instanceof FormulaParseError) {
      return { ok: false, error: error.message, offset: error.offset };
    }
    return { ok: false, error: "Invalid formula", offset: 0 };
  }
}

export function formatFormulaProgram(
  program: ParsedFormulaProgram,
  target: FormulaTarget,
): string {
  const lines = program.locals.map(
    (local) =>
      `local ${local.id} = ${formatFormulaCode(local.expression, target)}`,
  );
  const body = formatFormulaCode(program.expression, target);
  lines.push(body ? `return ${body}` : "return // empty");
  return lines.join("\n");
}

/** Backward-compatible helper when only expression is stored. */
export function tryParseFormulaSource(
  source: string,
  target: FormulaTarget,
): ParseFormulaProgramResult {
  const trimmed = source.trim();
  if (!trimmed.includes("\n") && !/^local\s+/im.test(trimmed)) {
    const parsed = tryParseFormulaCode(trimmed, { target });
    if (!parsed.ok) {
      return parsed;
    }
    return { ok: true, program: { expression: parsed.expression, locals: [] } };
  }
  return tryParseFormulaProgram(source, target);
}
