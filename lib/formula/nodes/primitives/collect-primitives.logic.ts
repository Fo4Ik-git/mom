import type { FormulaPrimitiveDefinition } from "@/lib/formula/nodes/_definition";

export type PrimitiveModuleEntry = {
  path: string;
  mod: Record<string, unknown>;
};

export function isPrimitiveDefinition(
  value: unknown,
): value is FormulaPrimitiveDefinition {
  if (typeof value !== "object" || value === null) {
    return false;
  }
  const candidate = value as FormulaPrimitiveDefinition;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.evaluate === "function" &&
    typeof candidate.matchNode === "function"
  );
}

/** Collect primitives from one `*.node.ts` module export surface. */
export function collectFromModule(
  mod: Record<string, unknown>,
): FormulaPrimitiveDefinition[] {
  const bundle = Object.entries(mod).find(
    ([key, value]) =>
      key.endsWith("_PRIMITIVES") &&
      Array.isArray(value) &&
      value.every(isPrimitiveDefinition),
  );
  if (bundle) {
    return bundle[1] as FormulaPrimitiveDefinition[];
  }

  const singles: FormulaPrimitiveDefinition[] = [];
  for (const [key, value] of Object.entries(mod)) {
    if (!key.endsWith("Primitive")) {
      continue;
    }
    if (isPrimitiveDefinition(value)) {
      singles.push(value);
    }
  }
  return singles;
}

export function sortPrimitives(
  items: FormulaPrimitiveDefinition[],
): FormulaPrimitiveDefinition[] {
  return [...items].sort((a, b) => {
    const aPrec = a.infix?.precedence;
    const bPrec = b.infix?.precedence;
    if (aPrec != null || bPrec != null) {
      const ap = aPrec ?? -1;
      const bp = bPrec ?? -1;
      if (ap !== bp) {
        return bp - ap;
      }
    }
    const aKey = a.call?.keyword ?? a.infix?.symbol ?? a.id;
    const bKey = b.call?.keyword ?? b.infix?.symbol ?? b.id;
    return aKey.localeCompare(bKey);
  });
}

export function buildAllPrimitivesFromModuleEntries(
  entries: ReadonlyArray<PrimitiveModuleEntry>,
): FormulaPrimitiveDefinition[] {
  const byId = new Map<string, FormulaPrimitiveDefinition>();

  for (const { path, mod } of entries) {
    for (const primitive of collectFromModule(mod)) {
      if (byId.has(primitive.id)) {
        throw new Error(
          `Duplicate formula primitive id "${primitive.id}" in ${path}`,
        );
      }
      byId.set(primitive.id, primitive);
    }
  }

  return sortPrimitives([...byId.values()]);
}
