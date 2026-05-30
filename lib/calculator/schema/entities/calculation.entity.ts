import { isAutoCalculationId } from "@/lib/calculator/config/auto-calculations";
import {
  extractFormulaSource,
  formatEntityOpening,
  formatFormulaBlock,
  formatScalar,
  parseEntityHeader,
  parseStructuredBody,
  readStringField,
} from "@/lib/calculator/schema/patterns/structured-block";
import type { ConfigEntityDefinition } from "@/lib/calculator/schema/_definition";
import { SCRIPT_FILE_AUTO_CALCULATIONS } from "@/lib/calculator/script/project-types";
import {
  normalizeParsedExpression,
  tryParseFormulaCode,
} from "@/lib/formula/code/code-parse";
import { formatFormulaCodeBlock } from "@/lib/formula/code/code-format";

export const calculationEntity: ConfigEntityDefinition = {
  keyword: "calc",
  label: "Calculation",
  scriptCompletions: {
    declarationSnippet:
      'calc calc_id "Label" {\n  label = "Label"\n  formula {\n    return field_item.var_price\n  }\n}',
    bodyFields: [
      { key: "label", detail: "Display name", insertText: 'label = "Label"' },
    ],
  },
  format: (declaration, ctx) => {
    if (declaration.kind !== "calculation") {
      return [];
    }
    const calc = declaration.data;
    if (isAutoCalculationId(calc.id) && !ctx.includeAutoCalculations) {
      return [];
    }
    const indent = ctx.indent ?? "  ";
    const formula = formatFormulaCodeBlock(calc.expression, {
      fieldId: calc.id,
    });
    const lines = [
      formatEntityOpening("calc", calc.id),
      `${indent}${formatScalar("label", calc.label)}`,
      ...formatFormulaBlock(formula, indent),
      "}",
    ];
    return lines;
  },
  parseHeader: (line) => parseEntityHeader(line, "(?:calc|calculation)"),
  parseBody: (body, header, ctx) => {
    const isAutoFile = ctx?.fileId === SCRIPT_FILE_AUTO_CALCULATIONS;
    const autoId = isAutoCalculationId(header.id);

    if (autoId && !isAutoFile) {
      return {
        error: `Auto-calculation "${header.id}" belongs in auto-calculations.calc`,
      };
    }
    if (!autoId && isAutoFile) {
      return {
        error: `Manual calculation "${header.id}" belongs in calculations.calc`,
      };
    }

    const structured = parseStructuredBody(body);
    if ("error" in structured) {
      return structured;
    }

    const label =
      readStringField(structured.fields, "label") || header.label || header.id;
    const formulaSource = extractFormulaSource(body, structured, header.flags);
    const parsed = tryParseFormulaCode(formulaSource, {
      target: { fieldId: header.id },
    });
    if (!parsed.ok) {
      return { error: `[${header.id}] ${parsed.error}` };
    }

    return {
      kind: "calculation",
      data: {
        id: header.id,
        label,
        expression: normalizeParsedExpression(parsed.expression),
      },
    };
  },
};
