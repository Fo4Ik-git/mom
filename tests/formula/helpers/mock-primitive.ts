import type { FormulaPrimitiveDefinition } from "@/lib/formula/nodes/_definition";

export function mockPrimitive(
  overrides: Partial<FormulaPrimitiveDefinition> & Pick<FormulaPrimitiveDefinition, "id">,
): FormulaPrimitiveDefinition {
  return {
    astType: "operation",
    matchNode: () => false,
    evaluate: () => 0,
    ...overrides,
  };
}
