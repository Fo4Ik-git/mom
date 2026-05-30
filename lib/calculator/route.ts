import "server-only";

import { db } from "@/lib/platform/db";
import type { Calculator } from "@prisma/client";

export { calculatorPublicPath } from "@/lib/calculator/paths";

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
