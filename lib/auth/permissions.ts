import { Role } from "@prisma/client";
import {
  hasStaffPlatformPrivileges,
  isStaffRole,
  isSuperAdminRole,
} from "@/lib/auth/staff-role";

export type PermissionError =
  | "forbidden"
  | "cannot_modify_elevated_user"
  | "forbidden_ai_access"
  | "forbidden_role_change"
  | "cannot_demote_self"
  | "cannot_modify_superadmin"
  | "cannot_ban_superadmin";

/** USER — no admin panel. ADMIN / SUPERADMIN — yes. */
export function canAccessAdminPanel(role: Role | string | null | undefined): boolean {
  return isStaffRole(role);
}

/** ADMIN or SUPERADMIN (cannot be managed by plain ADMIN). */
export function isElevatedUserRole(role: Role): boolean {
  return role === Role.ADMIN || role === Role.SUPERADMIN;
}

/**
 * ADMIN may change only USER accounts (and their own profile).
 * SUPERADMIN may change any account (subject to role-transfer rules).
 */
export function canManageUser(
  actorRole: Role,
  targetRole: Role,
  actorId?: string,
  targetUserId?: string,
): boolean {
  if (actorId && targetUserId && actorId === targetUserId && isStaffRole(actorRole)) {
    return true;
  }
  if (isSuperAdminRole(actorRole)) {
    return true;
  }
  if (actorRole === Role.ADMIN) {
    return targetRole === Role.USER;
  }
  return false;
}

/** Issue / revoke AI assistant access and token quotas. */
export function canGrantAiAccess(actorRole: Role): boolean {
  return isSuperAdminRole(actorRole);
}

/** Promote/demote ADMIN and transfer SUPERADMIN. */
export function canManageStaffRoles(actorRole: Role): boolean {
  return isSuperAdminRole(actorRole);
}

export function assertCanManageUser(
  actorRole: Role,
  targetRole: Role,
  actorId?: string,
  targetUserId?: string,
): "cannot_modify_elevated_user" | null {
  if (!canManageUser(actorRole, targetRole, actorId, targetUserId)) {
    return "cannot_modify_elevated_user";
  }
  return null;
}

export function assertCanGrantAiAccess(
  actorRole: Role,
): "forbidden_ai_access" | null {
  if (!canGrantAiAccess(actorRole)) {
    return "forbidden_ai_access";
  }
  return null;
}

export { hasStaffPlatformPrivileges, isStaffRole, isSuperAdminRole };
