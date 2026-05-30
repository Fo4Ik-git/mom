import type { Prisma } from "@prisma/client";
import {
  TABLE_PAGE_SIZES,
  parseTablePage,
  parseTablePageSize,
  type TablePageSize,
} from "@/lib/ui/table-pagination";

export const ADMIN_USERS_PAGE_SIZES = TABLE_PAGE_SIZES;
export type AdminUsersPageSize = TablePageSize;
export const parseAdminUsersPageSize = parseTablePageSize;
export const parseAdminUsersPage = parseTablePage;

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
