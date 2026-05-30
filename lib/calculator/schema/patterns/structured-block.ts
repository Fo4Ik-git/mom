import {
  parseBlockBody,
  parseNumberToken,
  quoteLabel,
  readQuotedString,
} from "@/lib/calculator/schema/patterns/block-body";

export type StructuredScalar = string | number | boolean;

export interface StructuredPropertyBlock {
  id: string;
  fields: Map<string, StructuredScalar>;
}

export interface ParsedStructuredBody {
  fields: Map<string, StructuredScalar>;
  listFields: Map<string, number[]>;
  properties: StructuredPropertyBlock[];
  rawBlocks: Map<string, string>;
}

export function normalizeFieldKey(key: string): string {
  const lower = key.toLowerCase();
  if (lower === "name") {
    return "label";
  }
  if (lower === "is_highlighted" || lower === "is_hilighted") {
    return "highlight";
  }
  if (lower === "timeunit" || lower === "time_unit") {
    return "time_unit";
  }
  if (lower === "auto_total" || lower === "autototal") {
    return "auto_total";
  }
  return lower;
}

export function parseScalar(raw: string): StructuredScalar | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  const quoted = readQuotedString(trimmed);
  if (quoted != null) {
    return quoted;
  }

  if (trimmed === "true") {
    return true;
  }
  if (trimmed === "false") {
    return false;
  }

  const number = parseNumberToken(trimmed);
  if (number != null) {
    return number;
  }

  return null;
}

export function parseNumberList(raw: string): number[] | null {
  const parts = raw
    .split(",")
    .map((part) => part.trim())
    .filter(Boolean);
  if (parts.length === 0) {
    return null;
  }

  const numbers: number[] = [];
  for (const part of parts) {
    const value = parseNumberToken(part);
    if (value == null) {
      return null;
    }
    numbers.push(value);
  }

  return numbers;
}

export function formatScalar(key: string, value: StructuredScalar): string {
  if (typeof value === "string") {
    return `${key} = ${quoteLabel(value)}`;
  }
  return `${key} = ${value}`;
}

function skipWhitespaceAndComments(source: string, start: number): number {
  let i = start;
  while (i < source.length) {
    const char = source[i];
    if (char === " " || char === "\t" || char === "\r" || char === "\n") {
      i += 1;
      continue;
    }
    if (char === "/" && source[i + 1] === "/") {
      while (i < source.length && source[i] !== "\n") {
        i += 1;
      }
      continue;
    }
    break;
  }
  return i;
}

function readIdentifier(source: string, start: number): { value: string; end: number } | null {
  let i = start;
  if (!/[a-z]/.test(source[i] ?? "")) {
    return null;
  }
  i += 1;
  while (i < source.length && /[a-z0-9_]/.test(source[i] ?? "")) {
    i += 1;
  }
  return { value: source.slice(start, i), end: i };
}

function readBalancedBlock(source: string, openBraceIndex: number): { body: string; end: number } | null {
  if (source[openBraceIndex] !== "{") {
    return null;
  }

  let depth = 0;
  let i = openBraceIndex;
  while (i < source.length) {
    const char = source[i];
    if (char === "{") {
      depth += 1;
    } else if (char === "}") {
      depth -= 1;
      if (depth === 0) {
        return {
          body: source.slice(openBraceIndex + 1, i),
          end: i + 1,
        };
      }
    }
    i += 1;
  }

  return null;
}

function readUntilNewline(source: string, start: number): { value: string; end: number } {
  let i = start;
  while (i < source.length && source[i] !== "\n") {
    i += 1;
  }
  return { value: source.slice(start, i).trim(), end: i + 1 };
}

export function parseStructuredBody(source: string): ParsedStructuredBody | { error: string } {
  const fields = new Map<string, StructuredScalar>();
  const listFields = new Map<string, number[]>();
  const properties: StructuredPropertyBlock[] = [];
  const rawBlocks = new Map<string, string>();

  let i = skipWhitespaceAndComments(source, 0);
  while (i < source.length) {
    i = skipWhitespaceAndComments(source, i);
    if (i >= source.length) {
      break;
    }

    const ident = readIdentifier(source, i);
    if (!ident) {
      return { error: `Unexpected character near column ${i + 1}` };
    }

    i = skipWhitespaceAndComments(source, ident.end);
    const next = source[i];

    if (next === "=") {
      i += 1;
      i = skipWhitespaceAndComments(source, i);
      const valuePart = readUntilNewline(source, i);
      const fieldKey = normalizeFieldKey(ident.value);

      if (fieldKey === "presets") {
        const presets = parseNumberList(valuePart.value);
        if (!presets) {
          return { error: `Invalid presets value for ${ident.value}` };
        }
        listFields.set("presets", presets);
        i = valuePart.end;
        continue;
      }

      const scalar = parseScalar(valuePart.value);
      if (scalar == null) {
        return { error: `Invalid value for ${ident.value}` };
      }
      fields.set(fieldKey, scalar);
      i = valuePart.end;
      continue;
    }

    if (next === "{") {
      const block = readBalancedBlock(source, i);
      if (!block) {
        return { error: `Unclosed block for ${ident.value}` };
      }

      const blockKey = normalizeFieldKey(ident.value);
      if (blockKey === "property") {
        return { error: "Property block requires an id: property var_cost { ... }" };
      }

      rawBlocks.set(blockKey, block.body.trim());
      i = skipWhitespaceAndComments(source, block.end);
      continue;
    }

    const secondIdent = readIdentifier(source, i);
    if (!secondIdent) {
      return { error: `Invalid statement starting with ${ident.value}` };
    }

    i = skipWhitespaceAndComments(source, secondIdent.end);
    if (source[i] !== "{") {
      return { error: `Expected block after ${ident.value} ${secondIdent.value}` };
    }

    const block = readBalancedBlock(source, i);
    if (!block) {
      return { error: `Unclosed block for ${ident.value} ${secondIdent.value}` };
    }

    const blockKey = normalizeFieldKey(ident.value);
    if (blockKey === "property") {
      const parsedInner = parseStructuredBody(block.body);
      if ("error" in parsedInner) {
        return parsedInner;
      }
      properties.push({
        id: secondIdent.value,
        fields: parsedInner.fields,
      });
    } else {
      rawBlocks.set(blockKey, block.body.trim());
    }

    i = skipWhitespaceAndComments(source, block.end);
  }

  return { fields, listFields, properties, rawBlocks };
}

export function stripReturnKeyword(source: string): string {
  const trimmed = source.trim();
  if (/^return\b/.test(trimmed)) {
    return trimmed.replace(/^return\s+/, "").trim();
  }
  return trimmed;
}

export function extractFormulaSource(
  body: string,
  structured: ParsedStructuredBody,
  legacyFlags: string[] = [],
): string {
  const formulaBlock =
    structured.rawBlocks.get("formula") ??
    structured.rawBlocks.get("calculations") ??
    structured.rawBlocks.get("expression");

  if (formulaBlock != null) {
    return stripReturnKeyword(formulaBlock);
  }

  const trimmedBody = body.trim();
  if (trimmedBody) {
    if (trimmedBody.startsWith("=")) {
      return trimmedBody.slice(1).trim();
    }
    return stripReturnKeyword(trimmedBody);
  }

  const eqIndex = legacyFlags.indexOf("=");
  if (eqIndex >= 0) {
    return legacyFlags.slice(eqIndex + 1).join(" ");
  }

  return legacyFlags.filter((flag) => flag !== "{" && flag !== "highlight").join(" ");
}

/** Full formula block body (keeps `local` lines and `return`). */
export function getFormulaBlockBody(
  structured: ParsedStructuredBody,
  body: string,
  legacyFlags: string[] = [],
): string {
  const formulaBlock =
    structured.rawBlocks.get("formula") ??
    structured.rawBlocks.get("calculations") ??
    structured.rawBlocks.get("expression");

  if (formulaBlock != null) {
    return formulaBlock.trim();
  }

  return extractFormulaSource(body, structured, legacyFlags);
}

export function formatFormulaBlock(formula: string, indent = "  "): string[] {
  const body = formula.trim() || "// empty";
  const lines = body.split("\n");
  const formulaLines =
    lines.length === 1 && !lines[0]!.trimStart().startsWith("return")
      ? [`${indent}  return ${lines[0]}`]
      : lines.map((line) => `${indent}  ${line}`);

  return [`${indent}formula {`, ...formulaLines, `${indent}}`];
}

export function formatPropertyBlock(
  id: string,
  fields: Record<string, StructuredScalar | undefined>,
  indent = "  ",
): string[] {
  const innerIndent = `${indent}  `;
  const lines = [`${indent}property ${id} {`];
  if (fields.label != null) {
    lines.push(`${innerIndent}${formatScalar("label", fields.label)}`);
  }
  if (fields.value != null) {
    lines.push(`${innerIndent}${formatScalar("value", fields.value)}`);
  }
  if (fields.auto_total === true) {
    lines.push(`${innerIndent}${formatScalar("auto_total", true)}`);
  }
  lines.push(`${indent}}`);
  return lines;
}

export function readBooleanField(
  fields: Map<string, StructuredScalar>,
  key: string,
  fallback = false,
): boolean {
  const value = fields.get(key);
  if (typeof value === "boolean") {
    return value;
  }
  return fallback;
}

export function readStringField(
  fields: Map<string, StructuredScalar>,
  key: string,
  fallback = "",
): string {
  const value = fields.get(key);
  return typeof value === "string" ? value : fallback;
}

export function readNumberField(
  fields: Map<string, StructuredScalar>,
  key: string,
): number | undefined {
  const value = fields.get(key);
  return typeof value === "number" ? value : undefined;
}

/** Header: `keyword id` or legacy `keyword id "Label"` */
export function parseEntityHeader(
  line: string,
  keywordPattern: string,
): { id: string; label: string; flags: string[] } | null {
  const pattern = new RegExp(
    `^${keywordPattern}\\s+([a-z][a-z0-9_]*)(?:\\s+"((?:\\\\.|[^"\\\\])*)")?(?:\\s*(.*))?$`,
  );
  const match = line.trim().match(pattern);
  if (!match) {
    return null;
  }

  const rest = match[3]?.trim() ?? "";
  const flags = rest ? rest.split(/\s+/).filter(Boolean) : [];

  return {
    id: match[1]!,
    label: match[2]?.replace(/\\"/g, '"') ?? "",
    flags,
  };
}

export function formatEntityOpening(keyword: string, id: string): string {
  return `${keyword} ${id} {`;
}

export function parseLegacyInputProperties(
  body: string,
): StructuredPropertyBlock[] | { error: string } {
  const bodyMap = parseBlockBody(body);
  const properties: StructuredPropertyBlock[] = [];

  for (const [key, values] of bodyMap.entries()) {
    if (key !== "property") {
      continue;
    }
    for (const value of values) {
      const tokens = value.split(/\s+/);
      const propId = tokens[0];
      if (!propId?.match(/^[a-z][a-z0-9_]*$/)) {
        return { error: `Invalid property id ${propId ?? "?"}` };
      }
      const labelToken = tokens[1];
      const label = labelToken ? readQuotedString(labelToken) : null;
      if (!label) {
        return { error: `Property label required for ${propId}` };
      }
      const eqIndex = value.indexOf("=");
      const numPart = eqIndex >= 0 ? value.slice(eqIndex + 1).trim() : "0";
      const num = parseNumberToken(numPart.split(/\s+/)[0] ?? "0") ?? 0;
      properties.push({
        id: propId,
        fields: new Map<string, StructuredScalar>([
          ["label", label],
          ["value", num],
        ]),
      });
    }
  }

  return properties;
}
