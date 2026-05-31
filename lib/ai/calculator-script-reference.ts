import "server-only";

import { readFileSync } from "node:fs";
import { join } from "node:path";

let cachedReference: string | null = null;

/** DSL reference loaded once per process from repo docs (not sent by the user). */
export function getCalculatorScriptReference(): string {
  if (cachedReference) {
    return cachedReference;
  }
  const path = join(process.cwd(), "docs", "calculator-script.md");
  cachedReference = readFileSync(path, "utf8");
  return cachedReference;
}
