import {
  formatEntityOpening,
  formatScalar,
  parseEntityHeader,
  parseStructuredBody,
  readNumberField,
  readStringField,
} from "@/lib/calculator/schema/patterns/structured-block";
import { parseNumberToken } from "@/lib/calculator/schema/patterns/block-body";
import type { ConfigEntityDefinition } from "@/lib/calculator/schema/_definition";

export const constantEntity: ConfigEntityDefinition = {
  keyword: "constant",
  label: "Constant",
  format: (declaration, ctx) => {
    if (declaration.kind !== "constant") {
      return [];
    }
    const constant = declaration.data;
    const indent = ctx.indent ?? "  ";
    return [
      formatEntityOpening("constant", constant.id),
      `${indent}${formatScalar("label", constant.label)}`,
      `${indent}${formatScalar("value", constant.value)}`,
      "}",
    ];
  },
  parseHeader: (line) => {
    const legacyInline =
      /^constant\s+([a-z][a-z0-9_]*)\s+"((?:\\.|[^"\\])*)"\s*=\s*(-?[\d.]+)\s*$/;
    const legacyMatch = line.trim().match(legacyInline);
    if (legacyMatch) {
      return {
        id: legacyMatch[1]!,
        label: legacyMatch[2]!.replace(/\\"/g, '"'),
        flags: [legacyMatch[3]!],
      };
    }
    return parseEntityHeader(line, "constant");
  },
  parseBody: (body, header) => {
    const structured = parseStructuredBody(body);
    if ("error" in structured) {
      return structured;
    }

    const numericFlag = header.flags.find(
      (flag) => flag !== "=" && flag !== "{" && parseNumberToken(flag) != null,
    );
    const label =
      readStringField(structured.fields, "label") || header.label || header.id;
    const value =
      readNumberField(structured.fields, "value") ??
      parseNumberToken(numericFlag ?? header.flags[0] ?? "0") ??
      0;

    return {
      kind: "constant",
      data: { id: header.id, label, value },
    };
  },
};
