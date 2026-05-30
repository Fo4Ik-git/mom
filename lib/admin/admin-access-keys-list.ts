import type { Prisma } from "@prisma/client";
import { normalizeAccessKeyCode } from "@/lib/access/access-key-code";

export function buildAdminAccessKeysSearchWhere(
  query: string,
): Prisma.AccessKeyWhereInput | undefined {
  const term = query.trim();
  if (!term) {
    return undefined;
  }

  const codeTerm = normalizeAccessKeyCode(term);
  return {
    OR: [
      { code: { contains: codeTerm } },
      { label: { contains: term } },
    ],
  };
}
