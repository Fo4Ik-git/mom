import { BanReason, Role, type User } from "@prisma/client";
import { db } from "@/lib/db";
import { getSupportContact, type SupportContact } from "@/lib/support-contact";

export interface UserAccountStatus {
  banned: boolean;
  banReason: BanReason | null;
  role: Role;
  support: SupportContact;
}

export async function getUserAccountStatus(
  userId: string,
): Promise<UserAccountStatus | null> {
  const [user, support] = await Promise.all([
    db.user.findUnique({
      where: { id: userId },
      select: { banned: true, banReason: true, role: true },
    }),
    getSupportContact(),
  ]);

  if (!user) {
    return null;
  }

  return {
    banned: user.banned,
    banReason: user.banReason,
    role: user.role,
    support,
  };
}

export function shouldBlockUser(user: Pick<User, "banned" | "role">): boolean {
  return user.role !== Role.ADMIN && user.banned;
}
