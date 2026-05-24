import { Role } from "@prisma/client";
import { auth } from "@/auth";
import { assertActiveUser, UserAccessError } from "@/lib/user-limits";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
    throw new Error("Unauthorized");
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

export async function requireAdmin() {
  const session = await requireAuth();
  if (session.user.role !== Role.ADMIN) {
    throw new Error("Forbidden");
  }
  return session;
}
