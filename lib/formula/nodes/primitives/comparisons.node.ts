import { createComparisonPrimitive } from "@/lib/formula/nodes/_helpers";

export const gtPrimitive = createComparisonPrimitive("gt", ">");
export const ltPrimitive = createComparisonPrimitive("lt", "<");
export const gtePrimitive = createComparisonPrimitive("gte", ">=");
export const ltePrimitive = createComparisonPrimitive("lte", "<=");
export const eqPrimitive = createComparisonPrimitive("eq", "==");
export const neqPrimitive = createComparisonPrimitive("neq", "!=");

export const COMPARISON_PRIMITIVES = [
  gtPrimitive,
  ltPrimitive,
  gtePrimitive,
  ltePrimitive,
  eqPrimitive,
  neqPrimitive,
];
