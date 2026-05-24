import { db } from "@/lib/db";
import type { Calculator } from "@prisma/client";

export const MOM_TEMPLATE_SLUG = "mom";

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

export async function getMomTemplateCalculator(): Promise<Calculator | null> {
  return db.calculator.findFirst({
    where: { slug: MOM_TEMPLATE_SLUG, isTemplate: true },
  });
}
