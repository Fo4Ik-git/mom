/**
 * Formula primitives — one file = one operator or function.
 *
 * To add a new primitive:
 * 1. Copy `_template.primitive.node.ts` → `my-fn.node.ts`
 * 2. Export `export const myFnPrimitive: FormulaPrimitiveDefinition = { ... }`
 *    (or `export const *_PRIMITIVES = [...]` for a bundle, e.g. comparisons.node.ts)
 *
 * Registration is automatic — add `*.node.ts`, then run `npm run generate:primitives`
 * (also runs before `dev` / `build`).
 */
import { collectAllPrimitives } from "@/lib/formula/nodes/primitives/collect-primitives";

export const ALL_PRIMITIVES = collectAllPrimitives();

export function getAllPrimitives() {
  return ALL_PRIMITIVES;
}
