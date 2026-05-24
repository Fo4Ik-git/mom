import { Role } from "@prisma/client";
import { auth } from "@/auth";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user?.id) {
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
