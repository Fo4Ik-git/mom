import {
  extractFormulaSource,
  formatEntityOpening,
  formatFormulaBlock,
  formatScalar,
  parseEntityHeader,
  parseStructuredBody,
  readBooleanField,
  readStringField,
} from "@/lib/calculator/schema/patterns/structured-block";
import type { ConfigEntityDefinition } from "@/lib/calculator/schema/_definition";
import {
  normalizeParsedExpression,
  tryParseFormulaCode,
} from "@/lib/formula/code-parse";
import { formatFormulaCodeBlock } from "@/lib/formula/code-format";

export const outputEntity: ConfigEntityDefinition = {
  keyword: "output",
  label: "Output",
  format: (declaration, ctx) => {
    if (declaration.kind !== "output") {
      return [];
    }
    const output = declaration.data;
    const indent = ctx.indent ?? "  ";
    const formula = formatFormulaCodeBlock(output.expression, {
      fieldId: output.id,
    });
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
    const formulaSource = extractFormulaSource(body, structured, header.flags);
    const parsed = tryParseFormulaCode(formulaSource, {
      target: { fieldId: header.id },
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
        expression: normalizeParsedExpression(parsed.expression),
      },
    };
  },
};
