/**
 * Template for a new calculator script entity.
 *
 * 1. Copy to `schema/entities/my-entity.entity.ts`
 * 2. Implement keyword, format, parseHeader, parseBody
 * 3. Register in `schema/registry.ts`
 */
import type { ConfigEntityDefinition } from "@/lib/calculator/schema/_definition";
import {
  formatEntityOpening,
  formatScalar,
  parseEntityHeader,
  parseStructuredBody,
  readStringField,
} from "@/lib/calculator/schema/patterns/structured-block";

export const templateEntity: ConfigEntityDefinition = {
  keyword: "my_entity",
  label: "My entity",
  scriptCompletions: {
    declarationSnippet:
      'my_entity my_id "Label" {\n  label = "Label"\n}',
    bodyFields: [
      { key: "label", detail: "Display name", insertText: 'label = "Label"' },
    ],
  },
  format: (declaration, ctx) => {
    if (declaration.kind !== "constant") {
      return [];
    }
    const indent = ctx.indent ?? "  ";
    return [
      formatEntityOpening("my_entity", declaration.data.id),
      `${indent}${formatScalar("label", declaration.data.label)}`,
      "}",
    ];
  },
  parseHeader: (line) => parseEntityHeader(line, "my_entity"),
  parseBody: (body, header) => {
    const structured = parseStructuredBody(body);
    if ("error" in structured) {
      return structured;
    }

    const label =
      readStringField(structured.fields, "label") || header.label || header.id;

    return {
      kind: "constant",
      data: {
        id: header.id,
        label,
        value: 0,
      },
    };
  },
};
