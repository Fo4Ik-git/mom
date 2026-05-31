import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { assertActiveUser, UserAccessError } from "@/lib/access/user-limits";
import { isStaffRole, isSuperAdminRole } from "@/lib/auth/staff-role";
import { db } from "@/lib/platform/db";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
  }

  const dbUser = await db.user.findUnique({
    where: { id: session.user.id },
    select: { role: true },
  });
  if (dbUser) {
    session.user.role = dbUser.role;
  }

  return session;
}

/** Authenticated user that is not banned and has valid access period. */
export async function requireActiveUser() {
  const session = await requireAuth();
  try {
    await assertActiveUser(session.user.id);
  } catch (error) {
    if (error instanceof UserAccessError) {
      throw error;
    }
    throw new Error("Unauthorized");
  }
  return session;
}

/** ADMIN or SUPERADMIN — admin panel and staff APIs. */
export async function requireAdmin() {
  const session = await requireAuth();
  if (!isStaffRole(session.user.role)) {
    throw new Error("Forbidden");
  }
  return session;
}

export async function requireSuperAdmin() {
  const session = await requireAuth();
  if (!isSuperAdminRole(session.user.role)) {
    throw new Error("Forbidden");
  }
  return session;
}
