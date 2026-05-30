import type { ScriptDeclaration } from "@/lib/calculator/schema/_definition";
import { parseScriptSource } from "@/lib/calculator/script/parse-source";
import type { ScriptParseError } from "@/lib/calculator/script/parse";
import {
  FILE_ALLOWED_KINDS,
  type ScriptProjectFileId,
} from "@/lib/calculator/script/project-types";

export function parseScriptFile(
  source: string,
  fileId: ScriptProjectFileId,
): { declarations: ScriptDeclaration[]; errors: ScriptParseError[] } {
  const trimmed = source.trim();
  if (!trimmed) {
    return { declarations: [], errors: [] };
  }

  const { declarations, errors } = parseScriptSource(source, { fileId });
  const allowed = new Set(FILE_ALLOWED_KINDS[fileId]);
  const fileErrors = errors.map((error) => ({ ...error, file: fileId }));

  for (const decl of declarations) {
    if (!allowed.has(decl.kind)) {
      fileErrors.push({
        file: fileId,
        line: 1,
        message: `${decl.kind} is not allowed in ${fileId} (expected: ${FILE_ALLOWED_KINDS[fileId].join(", ")})`,
      });
    }
  }

  const valid = declarations.filter((decl) => allowed.has(decl.kind));

  return { declarations: valid, errors: fileErrors };
}
