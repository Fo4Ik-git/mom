import { Role, type User } from "@prisma/client";
import { db } from "@/lib/db";
import { getPlatformSettings } from "@/lib/platform-settings";

export class UserAccessError extends Error {
  code:
    | "banned"
    | "access_expired"
    | "calculator_limit"
    | "unauthorized";

  constructor(
    code: UserAccessError["code"],
    message: string,
  ) {
    super(message);
    this.code = code;
  }
}

export function isAccessActive(user: Pick<User, "role" | "accessExpiresAt">): boolean {
  if (user.role === Role.ADMIN) {
    return true;
  }
  if (!user.accessExpiresAt) {
    return true;
  }
  return user.accessExpiresAt.getTime() > Date.now();
}

export async function getEffectiveMaxCalculators(
  user: Pick<User, "role" | "maxCalculators">,
): Promise<number | null> {
  if (user.role === Role.ADMIN) {
    return null;
  }
  if (user.maxCalculators != null) {
    return user.maxCalculators;
  }
  const platform = await getPlatformSettings();
  return platform.defaultMaxCalculators;
}

export async function countUserCalculators(userId: string): Promise<number> {
  return db.calculator.count({
    where: { userId, isTemplate: false },
  });
}

export interface UserQuotaSnapshot {
  current: number;
  max: number | null;
  canCreate: boolean;
  accessActive: boolean;
  accessExpiresAt: string | null;
  role: Role;
}

export async function getUserQuota(userId: string): Promise<UserQuotaSnapshot> {
  const user = await db.user.findUniqueOrThrow({ where: { id: userId } });
  const current = await countUserCalculators(userId);
  const max = await getEffectiveMaxCalculators(user);
  const accessActive = isAccessActive(user);

  return {
    current,
    max,
    canCreate:
      accessActive && (max === null || current < max),
    accessActive,
    accessExpiresAt: user.accessExpiresAt?.toISOString() ?? null,
    role: user.role,
  };
}

export async function assertActiveUser(userId: string): Promise<User> {
  const user = await db.user.findUnique({ where: { id: userId } });
  if (!user) {
    throw new UserAccessError("unauthorized", "Unauthorized");
  }
  if (user.banned) {
    throw new UserAccessError("banned", "Account is banned");
  }
  if (!isAccessActive(user)) {
    throw new UserAccessError("access_expired", "Access has expired");
  }
  return user;
}

export async function assertCanCreateCalculator(userId: string): Promise<void> {
  const user = await assertActiveUser(userId);
  const max = await getEffectiveMaxCalculators(user);
  if (max === null) {
    return;
  }
  const current = await countUserCalculators(userId);
  if (current >= max) {
    throw new UserAccessError(
      "calculator_limit",
      `Calculator limit reached (${current}/${max})`,
    );
  }
}
