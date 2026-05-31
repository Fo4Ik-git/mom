import { readdirSync } from "node:fs";
import { join } from "node:path";

export const PRIMITIVES_DIR = join(
  process.cwd(),
  "lib/formula/nodes/primitives",
);

/** `*.node.ts` files to load (excludes `_template*`). */
export function listPrimitiveNodeFiles(primitivesDir = PRIMITIVES_DIR): string[] {
  return readdirSync(primitivesDir)
    .filter(
      (name) =>
        name.endsWith(".node.ts") && !name.startsWith("_template"),
    )
    .sort((a, b) => a.localeCompare(b));
}

export function moduleImportAlias(fileName: string): string {
  const base = fileName.replace(/\.ts$/, "");
  return base.replace(/[^a-zA-Z0-9_$]/g, "_");
}

export function buildPrimitiveModulesSource(nodeFiles: string[]): string {
  const importLines: string[] = [];
  const entryLines: string[] = [];

  for (const file of nodeFiles) {
    const base = file.replace(/\.ts$/, "");
    const alias = moduleImportAlias(file);
    importLines.push(`import * as ${alias} from "./${base}";`);
    entryLines.push(`  { path: "./${file}", mod: ${alias} },`);
  }

  return `/** AUTO-GENERATED — run \`npm run generate:primitives\`. Do not edit. */

${importLines.join("\n")}

export const PRIMITIVE_MODULE_ENTRIES: ReadonlyArray<{
  path: string;
  mod: Record<string, unknown>;
}> = [
${entryLines.join("\n")}
];
`;
}
