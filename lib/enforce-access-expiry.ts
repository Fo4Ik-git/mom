import { BanReason, Role } from "@prisma/client";
import { db } from "@/lib/db";

function startOfLocalToday(): Date {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  return start;
}

export async function enforceAllExpiredAccess(): Promise<number> {
  const startOfToday = startOfLocalToday();

  const result = await db.user.updateMany({
    where: {
      role: Role.USER,
      banned: false,
      accessExpiresAt: { lt: startOfToday },
    },
    data: {
      banned: true,
      banReason: BanReason.ACCESS_EXPIRED,
    },
  });

  return result.count;
}
