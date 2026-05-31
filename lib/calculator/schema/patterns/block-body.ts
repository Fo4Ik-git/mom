/** Shared helpers for `{ ... }` block bodies in calculator script */

export function parseBlockBody(body: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  const lines = body.split("\n");

  for (const rawLine of lines) {
    const line = rawLine.trim();
    if (!line || line.startsWith("//")) {
      continue;
    }

    const parts = tokenizeAssignmentLine(line);
    if (parts.length === 0) {
      continue;
    }

    const key = parts[0]!.toLowerCase();
    const rest = parts.slice(1);
    const existing = map.get(key) ?? [];
    existing.push(rest.join(" "));
    map.set(key, existing);
  }

  return map;
}

/** Tokens for `key = value` lines (supports multiple assignments per line). */
export function tokenizeAssignmentLine(line: string): string[] {
  const tokens: string[] = [];
  let current = "";
  let inString = false;

  for (let i = 0; i < line.length; i += 1) {
    const char = line[i]!;

    if (char === '"' && line[i - 1] !== "\\") {
      inString = !inString;
      current += char;
      continue;
    }

    if (!inString && /\s/.test(char)) {
      if (current) {
        tokens.push(current);
        current = "";
      }
      continue;
    }

    current += char;
  }

  if (current) {
    tokens.push(current);
  }

  return tokens;
}

export function readQuotedString(token: string): string | null {
  const match = token.match(/^"((?:\\.|[^"\\])*)"/);
  if (!match) {
    return null;
  }
  return match[1]!.replace(/\\"/g, '"');
}

export function parseNumberToken(token: string): number | null {
  const value = Number(token);
  return Number.isFinite(value) ? value : null;
}

export function indentBlock(lines: string[], indent = "  "): string[] {
  return lines.map((line) => (line ? `${indent}${line}` : line));
}

export function quoteLabel(label: string): string {
  return `"${label.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

/** Block-wrapped formula body: `header {` + indented formula lines + `}` */
export function formatFormulaBlock(headerLine: string, formula: string): string[] {
  const body = formula.trim() || "// empty";
  return [`${headerLine} {`, ...indentBlock(body.split("\n")), `}`];
}
