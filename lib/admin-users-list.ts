import type { Prisma } from "@prisma/client";

export const ADMIN_USERS_PAGE_SIZES = [10, 25, 50, 100] as const;
export type AdminUsersPageSize = (typeof ADMIN_USERS_PAGE_SIZES)[number];

export function parseAdminUsersPageSize(value: string | null): AdminUsersPageSize {
  const n = Number(value);
  if (ADMIN_USERS_PAGE_SIZES.includes(n as AdminUsersPageSize)) {
    return n as AdminUsersPageSize;
  }
  return 10;
}

export function parseAdminUsersPage(value: string | null): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return Math.floor(n);
}

export function buildAdminUsersSearchWhere(
  query: string,
): Prisma.UserWhereInput | undefined {
  const term = query.trim();
  if (!term) {
    return undefined;
  }

  const emailTerm = term.toLowerCase();
  return {
    OR: [
      { email: { contains: emailTerm } },
      { name: { contains: term } },
    ],
  };
}
