import {
  formatEntityOpening,
  formatFormulaBlock,
  formatScalar,
  getFormulaBlockBody,
  parseEntityHeader,
  parseStructuredBody,
  readBooleanField,
  readStringField,
} from "@/lib/calculator/schema/patterns/structured-block";
import type { ConfigEntityDefinition } from "@/lib/calculator/schema/_definition";
import { normalizeParsedExpression } from "@/lib/formula/code/code-parse";
import { tryParseFormulaProgram } from "@/lib/formula/code/formula-program";
import { formatFormulaCodeBlock } from "@/lib/formula/code/code-format";

export const outputEntity: ConfigEntityDefinition = {
  keyword: "output",
  label: "Output",
  scriptCompletions: {
    declarationSnippet:
      'output output_id "Label" {\n  label = "Label"\n  highlight = true\n  formula {\n    return field_item.var_price\n  }\n}',
    bodyFields: [
      { key: "label", detail: "Display name", insertText: 'label = "Label"' },
      {
        key: "highlight",
        detail: "Emphasize in results panel",
        insertText: "highlight = true",
      },
    ],
  },
  format: (declaration, ctx) => {
    if (declaration.kind !== "output") {
      return [];
    }
    const output = declaration.data;
    const indent = ctx.indent ?? "  ";
    const formula = formatFormulaCodeBlock(
      output.expression,
      { fieldId: output.id },
      output.locals,
    );
    const lines = [
      formatEntityOpening("output", output.id),
      `${indent}${formatScalar("label", output.label)}`,
    ];

    if (output.highlight) {
      lines.push(`${indent}${formatScalar("highlight", true)}`);
    }

    lines.push(...formatFormulaBlock(formula, indent), "}");
    return lines;
  },
  parseHeader: (line) => {
    const header = parseEntityHeader(line, "output");
    if (!header) {
      return null;
    }
    if (header.flags.includes("highlight") && !header.label) {
      return header;
    }
    return header;
  },
  parseBody: (body, header) => {
    const structured = parseStructuredBody(body);
    if ("error" in structured) {
      return structured;
    }

    const label =
      readStringField(structured.fields, "label") || header.label || header.id;
    const highlight =
      readBooleanField(structured.fields, "highlight") ||
      header.flags.includes("highlight");
    const formulaSource = getFormulaBlockBody(structured, body, header.flags);
    const parsed = tryParseFormulaProgram(formulaSource, {
      fieldId: header.id,
    });
    if (!parsed.ok) {
      return { error: `[${header.id}] ${parsed.error}` };
    }

    return {
      kind: "output",
      data: {
        id: header.id,
        label,
        highlight,
        expression: normalizeParsedExpression(parsed.program.expression),
        locals:
          parsed.program.locals.length > 0
            ? parsed.program.locals.map((local) => ({
                id: local.id,
                expression: normalizeParsedExpression(local.expression),
              }))
            : undefined,
      },
    };
  },
};
