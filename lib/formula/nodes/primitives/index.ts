/**
 * Formula primitives — one file = one operator or function.
 *
 * To add a new primitive:
 * 1. Copy `_template.primitive.node.ts` → `my-fn.node.ts`
 * 2. Import it below and append to `ALL_PRIMITIVES`
 *
 * Registry picks up: eval, code parse/format, palette blocks, autocomplete.
 */
import type { FormulaPrimitiveDefinition } from "@/lib/formula/nodes/_definition";
import { avgPrimitive } from "@/lib/formula/nodes/primitives/avg.node";
import { avgRowsPrimitive } from "@/lib/formula/nodes/primitives/avg-rows.node";
import { countPrimitive } from "@/lib/formula/nodes/primitives/count.node";
import { countRowsPrimitive } from "@/lib/formula/nodes/primitives/count-rows.node";
import { dividePrimitive } from "@/lib/formula/nodes/primitives/divide.node";
import { maxPrimitive } from "@/lib/formula/nodes/primitives/max.node";
import { ifPrimitive } from "@/lib/formula/nodes/primitives/if.node";
import { maxRowsPrimitive } from "@/lib/formula/nodes/primitives/max-rows.node";
import { minPrimitive } from "@/lib/formula/nodes/primitives/min.node";
import { minRowsPrimitive } from "@/lib/formula/nodes/primitives/min-rows.node";
import { minusPrimitive } from "@/lib/formula/nodes/primitives/minus.node";
import { multiplyPrimitive } from "@/lib/formula/nodes/primitives/multiply.node";
import { plusPrimitive } from "@/lib/formula/nodes/primitives/plus.node";
import { sumPrimitive } from "@/lib/formula/nodes/primitives/sum.node";
import { sumRowsPrimitive } from "@/lib/formula/nodes/primitives/sum-rows.node";

export const ALL_PRIMITIVES: FormulaPrimitiveDefinition[] = [
  plusPrimitive,
  minusPrimitive,
  multiplyPrimitive,
  dividePrimitive,
  sumPrimitive,
  countPrimitive,
  avgPrimitive,
  minPrimitive,
  maxPrimitive,
  sumRowsPrimitive,
  countRowsPrimitive,
  avgRowsPrimitive,
  minRowsPrimitive,
  maxRowsPrimitive,
  ifPrimitive,
];

export function getAllPrimitives() {
  return ALL_PRIMITIVES;
}
