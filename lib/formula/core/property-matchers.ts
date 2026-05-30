import type { InputProperty } from "@/types/calculator";

export function costLike(property: InputProperty): boolean {
  return (
    /собів|собест|cost|себест/i.test(property.label) ||
    property.id.includes("cost")
  );
}

export function priceLike(property: InputProperty): boolean {
  if (costLike(property)) {
    return false;
  }
  return (
    /ціна|price|варт|rate|тариф|стоим/i.test(property.label) ||
    property.id.includes("price")
  );
}

/** Default auto-total for standard cost/price columns when not set in script. */
export function defaultPropertyAutoTotal(property: InputProperty): boolean {
  if (property.id === "var_cost" || property.id === "var_price") {
    return true;
  }
  return costLike(property) || priceLike(property);
}
