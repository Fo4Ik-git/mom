import { Role } from "@prisma/client";
import { db } from "@/lib/platform/db";
import { canManageStaffRoles } from "@/lib/auth/permissions";

export type RoleChangeError =
  | "forbidden_role_change"
  | "cannot_demote_self"
  | "cannot_modify_superadmin";

export async function assertRoleChangeAllowed(
  actorId: string,
  actorRole: Role,
  targetUserId: string,
  newRole: Role,
): Promise<RoleChangeError | null> {
  const target = await db.user.findUnique({
    where: { id: targetUserId },
    select: { role: true },
  });

  if (!target) {
    return "forbidden_role_change";
  }

  if (newRole === target.role) {
    return null;
  }

  if (
    target.role === Role.SUPERADMIN &&
    actorRole !== Role.SUPERADMIN
  ) {
    return "cannot_modify_superadmin";
  }

  const elevatesToStaff =
    newRole === Role.ADMIN || newRole === Role.SUPERADMIN;
  const demotesFromStaff =
    target.role === Role.ADMIN || target.role === Role.SUPERADMIN;

  if (
    (elevatesToStaff || demotesFromStaff) &&
    !canManageStaffRoles(actorRole)
  ) {
    return "forbidden_role_change";
  }

  if (targetUserId === actorId) {
    if (newRole === Role.USER) {
      return "cannot_demote_self";
    }
    if (
      actorRole === Role.SUPERADMIN &&
      newRole !== Role.SUPERADMIN
    ) {
      return "cannot_demote_self";
    }
  }

  return null;
}

/** Applies role change; transfers SUPERADMIN (demotes previous holder to ADMIN). */
export async function applyUserRoleChange(
  targetUserId: string,
  newRole: Role,
): Promise<void> {
  if (newRole === Role.SUPERADMIN) {
    await db.$transaction([
      db.user.updateMany({
        where: {
          role: Role.SUPERADMIN,
          id: { not: targetUserId },
        },
        data: { role: Role.ADMIN },
      }),
      db.user.update({
        where: { id: targetUserId },
        data: { role: Role.SUPERADMIN },
      }),
    ]);
    return;
  }

  await db.user.update({
    where: { id: targetUserId },
    data: { role: newRole },
  });
}
