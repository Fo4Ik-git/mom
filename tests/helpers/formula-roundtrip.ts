import { expect } from "vitest";
import { formatFormulaCode } from "@/lib/formula/code/code-format";
import {
  normalizeParsedExpression,
  parseFormulaCode,
} from "@/lib/formula/code/code-parse";
import type { FormulaTarget } from "@/lib/formula/core/formula-target";
import type { EvalContext } from "@/lib/formula/runtime/block-evaluate";
import { evaluateExpressionViaRegistry } from "@/lib/formula/nodes/registry";

export const DEFAULT_FORMULA_TARGET: FormulaTarget = { fieldId: "output_total" };

export function expectFormulaRoundTrip(
  source: string,
  target: FormulaTarget = DEFAULT_FORMULA_TARGET,
  options?: { rowFieldId?: string },
) {
  const parseOptions = { target, rowFieldId: options?.rowFieldId };
  const parsed = parseFormulaCode(source, parseOptions);
  const formatted = formatFormulaCode(parsed, target, options);
  const reparsed = parseFormulaCode(formatted, parseOptions);
  expect(normalizeParsedExpression(reparsed)).toEqual(
    normalizeParsedExpression(parsed),
  );
  return { parsed, formatted };
}

export function expectFormulaEval(
  source: string,
  expected: number,
  context: EvalContext,
  target: FormulaTarget = DEFAULT_FORMULA_TARGET,
) {
  const expression = parseFormulaCode(source, { target });
  expect(evaluateExpressionViaRegistry(expression, context)).toBe(expected);
}
