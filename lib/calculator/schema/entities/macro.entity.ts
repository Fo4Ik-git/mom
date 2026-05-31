import {
  formatEntityOpening,
  formatFormulaBlock,
  formatScalar,
  getFormulaBlockBody,
  parseEntityHeader,
  parseStructuredBody,
  readStringField,
} from "@/lib/calculator/schema/patterns/structured-block";
import type { ConfigEntityDefinition } from "@/lib/calculator/schema/_definition";
import { normalizeParsedExpression } from "@/lib/formula/code/code-parse";
import { tryParseFormulaProgram } from "@/lib/formula/code/formula-program";
import { formatFormulaCodeBlock } from "@/lib/formula/code/code-format";

export const macroEntity: ConfigEntityDefinition = {
  keyword: "macro",
  label: "Formula macro",
  scriptCompletions: {
    declarationSnippet:
      'macro macro_id "Label" {\n  label = "Label"\n  formula {\n    return field_item.var_price\n  }\n}',
    bodyFields: [
      { key: "label", detail: "Display name", insertText: 'label = "Label"' },
    ],
  },
  format: (declaration, ctx) => {
    if (declaration.kind !== "macro") {
      return [];
    }
    const macro = declaration.data;
    const indent = ctx.indent ?? "  ";
    const formula = formatFormulaCodeBlock(
      macro.expression,
      { fieldId: macro.id },
    );
    return [
      formatEntityOpening("macro", macro.id),
      `${indent}${formatScalar("label", macro.label)}`,
      ...formatFormulaBlock(formula, indent),
      "}",
    ];
  },
  parseHeader: (line) => parseEntityHeader(line, "macro"),
  parseBody: (body, header) => {
    const structured = parseStructuredBody(body);
    if ("error" in structured) {
      return structured;
    }

    const label =
      readStringField(structured.fields, "label") || header.label || header.id;
    const formulaSource = getFormulaBlockBody(structured, body, header.flags);
    const parsed = tryParseFormulaProgram(formulaSource, {
      fieldId: header.id,
    });
    if (!parsed.ok) {
      return { error: `[${header.id}] ${parsed.error}` };
    }

    return {
      kind: "macro",
      data: {
        id: header.id,
        label,
        expression: normalizeParsedExpression(parsed.program.expression),
      },
    };
  },
};
