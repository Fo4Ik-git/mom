import { Role } from "@prisma/client";

/** Platform staff with admin panel access (ADMIN or SUPERADMIN). */
export function isStaffRole(role: Role | string | null | undefined): boolean {
  return role === Role.ADMIN || role === Role.SUPERADMIN;
}

export function isSuperAdminRole(role: Role | string | null | undefined): boolean {
  return role === Role.SUPERADMIN;
}

/** Unlimited calculators, access period, and AI token quota. */
export function hasStaffPlatformPrivileges(
  role: Role | string | null | undefined,
): boolean {
  return isStaffRole(role);
}
