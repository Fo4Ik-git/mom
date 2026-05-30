import type { AggregateFunction } from "@/types/calculator";

export function applyAggregateFunction(
  fn: AggregateFunction,
  values: number[],
): number {
  if (values.length === 0) {
    return 0;
  }

  switch (fn) {
    case "SUM":
      return values.reduce((sum, value) => sum + value, 0);
    case "COUNT":
      return values.length;
    case "AVG":
      return values.reduce((sum, value) => sum + value, 0) / values.length;
    case "MIN":
      return Math.min(...values);
    case "MAX":
      return Math.max(...values);
    default:
      throw new Error("Invalid aggregate function");
  }
}

export function getPropertyValue(
  properties: { id: string; value: number }[],
  propertyId: string,
): number {
  return properties.find((p) => p.id === propertyId)?.value ?? 0;
}
