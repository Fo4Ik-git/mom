import type { ScriptDeclaration } from "@/lib/calculator/schema/_definition";
import type { ScriptParseContext } from "@/lib/calculator/schema/_definition";
import { matchDeclarationHeader } from "@/lib/calculator/schema/registry";
import type { ScriptParseError } from "@/lib/calculator/script/parse";

export function parseScriptSource(
  source: string,
  ctx?: ScriptParseContext,
): {
  declarations: ScriptDeclaration[];
  errors: ScriptParseError[];
} {
  const lines = source.split("\n");
  const errors: ScriptParseError[] = [];
  const declarations: ScriptDeclaration[] = [];

  let i = 0;
  while (i < lines.length) {
    const lineNumber = i + 1;
    const line = lines[i] ?? "";
    const trimmed = line.trim();

    if (!trimmed || trimmed.startsWith("//")) {
      i += 1;
      continue;
    }

    const matched = matchDeclarationHeader(trimmed);
    if (!matched) {
      errors.push({
        message: `Unknown declaration: ${trimmed.slice(0, 48)}`,
        line: lineNumber,
      });
      i += 1;
      continue;
    }

    if (matched.isBlock) {
      const { bodyLines, endIndex, error } = readBlockBody(lines, i + 1);
      if (error) {
        errors.push({ message: error, line: lineNumber });
        i = endIndex;
        continue;
      }

      const parsed = matched.entity.parseBody(
        bodyLines.join("\n"),
        matched.header,
        ctx,
      );
      if ("error" in parsed) {
        errors.push({ message: parsed.error, line: lineNumber });
      } else {
        declarations.push(parsed);
      }
      i = endIndex;
      continue;
    }

    const parsed = matched.entity.parseBody("", matched.header, ctx);
    if ("error" in parsed) {
      errors.push({ message: parsed.error, line: lineNumber });
    } else {
      declarations.push(parsed);
    }
    i += 1;
  }

  return { declarations, errors };
}

function readBlockBody(
  lines: string[],
  startIndex: number,
): { bodyLines: string[]; endIndex: number; error?: string } {
  const bodyLines: string[] = [];
  let depth = 1;
  let i = startIndex;

  while (i < lines.length) {
    const line = lines[i] ?? "";
    let delta = 0;
    for (const char of line) {
      if (char === "{") {
        delta += 1;
      } else if (char === "}") {
        delta -= 1;
      }
    }

    const nextDepth = depth + delta;
    if (nextDepth <= 0) {
      if (line.trim() !== "}") {
        bodyLines.push(line);
      }
      return { bodyLines, endIndex: i + 1 };
    }

    bodyLines.push(line);
    depth = nextDepth;
    i += 1;
  }

  return {
    bodyLines,
    endIndex: i,
    error: "Unclosed block — missing `}`",
  };
}
