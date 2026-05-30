import { formatDeclaration } from "@/lib/calculator/script/format";
import { parseScriptFile } from "@/lib/calculator/script/parse-file";
import type { ScriptProjectFileId } from "@/lib/calculator/script/project-types";

/** Pretty-print declarations in the active project file (when parse is clean). */
export function formatScriptFileSource(
  source: string,
  fileId: ScriptProjectFileId,
): { formatted: string; ok: boolean } {
  const { declarations, errors } = parseScriptFile(source, fileId);
  if (errors.length > 0 || declarations.length === 0) {
    return { formatted: source, ok: false };
  }
  return {
    formatted: declarations.map((decl) => formatDeclaration(decl)).join("\n\n"),
    ok: true,
  };
}
