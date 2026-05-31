import { writeFileSync } from "node:fs";
import { join } from "node:path";
import {
  buildPrimitiveModulesSource,
  listPrimitiveNodeFiles,
  PRIMITIVES_DIR,
} from "@/lib/formula/nodes/primitives/primitive-modules.codegen";

const outFile = join(PRIMITIVES_DIR, "primitive-modules.generated.ts");
const nodeFiles = listPrimitiveNodeFiles();

writeFileSync(outFile, buildPrimitiveModulesSource(nodeFiles));
console.log(
  `Wrote ${outFile} (${nodeFiles.length} primitive module${nodeFiles.length === 1 ? "" : "s"})`,
);
