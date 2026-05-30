import { db } from "@/lib/platform/db";
import type { Calculator } from "@prisma/client";

export function calculatorPublicPath(id: string): string {
  return `/c/${id}`;
}

/** Resolve /c/:param by database id, with legacy slug fallback. */
export async function findCalculatorByRouteParam(
  param: string,
): Promise<Calculator | null> {
  const byId = await db.calculator.findUnique({ where: { id: param } });
  if (byId) {
    return byId;
  }

  return db.calculator.findUnique({ where: { slug: param } });
}
