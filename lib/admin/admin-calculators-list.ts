import type { Prisma } from "@prisma/client";

export function buildAdminCalculatorsSearchWhere(
  query: string,
): Prisma.CalculatorWhereInput | undefined {
  const term = query.trim();
  if (!term) {
    return undefined;
  }

  const emailTerm = term.toLowerCase();
  return {
    OR: [
      { name: { contains: term } },
      { slug: { contains: term } },
      { user: { email: { contains: emailTerm } } },
    ],
  };
}
