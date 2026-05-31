import type { FormulaPrimitiveDefinition } from "@/lib/formula/nodes/_definition";
import { buildAllPrimitivesFromModuleEntries } from "@/lib/formula/nodes/primitives/collect-primitives.logic";
import { PRIMITIVE_MODULE_ENTRIES } from "@/lib/formula/nodes/primitives/primitive-modules.generated";

/** All `*.node.ts` primitives in this folder (excludes `_template*`). */
export function collectAllPrimitives(): FormulaPrimitiveDefinition[] {
  return buildAllPrimitivesFromModuleEntries(PRIMITIVE_MODULE_ENTRIES);
}
