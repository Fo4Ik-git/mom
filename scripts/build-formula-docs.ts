import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { collectFormulaDocs } from "@/lib/formula/docs/collect-formula-docs";

const outDir = join(process.cwd(), "docs", "generated");
const data = collectFormulaDocs();

mkdirSync(outDir, { recursive: true });

writeFileSync(
  join(outDir, "formula-docs.json"),
  `${JSON.stringify(data, null, 2)}\n`,
);

const mdLines = [
  "# Formula & script reference (generated)",
  "",
  "Do not edit — run `npm run docs:build`.",
  "",
];

for (const entry of data.primitives) {
  mdLines.push(`## ${entry.id}`, "", `\`${entry.syntax}\``, "", "```", entry.example, "```", "");
}

writeFileSync(join(outDir, "formula-docs.md"), `${mdLines.join("\n")}\n`);

console.log(`Wrote ${outDir}/formula-docs.json and formula-docs.md`);
