import "server-only";

import type { AiTokenQuotaPeriod } from "@prisma/client";
import { Role } from "@prisma/client";
import { hasStaffPlatformPrivileges } from "@/lib/auth/staff-role";
import {
  getQuotaPeriodEnd,
  getQuotaPeriodStart,
} from "@/lib/ai/ai-quota-period";
import {
  effectiveAiTokenQuotaPeriod,
  hasUnlimitedAiTokens,
  isAiAssistantAccessActive,
  type AiAccessQuotaUserFields,
} from "@/lib/ai/ai-access";
import type { AiQuotaSnapshot, GeminiTokenUsage } from "@/lib/ai/token-usage-types";
import { db } from "@/lib/platform/db";

export async function sumUserTokensSince(
  userId: string,
  since: Date,
): Promise<number> {
  const result = await db.aiTokenUsage.aggregate({
    where: { userId, createdAt: { gte: since } },
    _sum: { totalTokens: true },
  });
  return result._sum.totalTokens ?? 0;
}

export async function sumUserTokensAllTime(userId: string): Promise<number> {
  const result = await db.aiTokenUsage.aggregate({
    where: { userId },
    _sum: { totalTokens: true },
  });
  return result._sum.totalTokens ?? 0;
}

export async function getAiQuotaSnapshot(
  user: AiAccessQuotaUserFields,
  now = new Date(),
): Promise<AiQuotaSnapshot> {
  const period = effectiveAiTokenQuotaPeriod(user);
  const periodStart = getQuotaPeriodStart(period, now);
  const periodEnd = getQuotaPeriodEnd(period, periodStart);
  const hasAccess = isAiAssistantAccessActive(user, now);
  const unlimited = hasUnlimitedAiTokens(user);

  const [usedInPeriod, usedAllTime] = await Promise.all([
    sumUserTokensSince(user.id, periodStart),
    sumUserTokensAllTime(user.id),
  ]);

  const quota = unlimited ? null : user.aiTokenQuota;
  const remaining =
    quota != null ? Math.max(0, quota - usedInPeriod) : null;

  return {
    hasAccess,
    unlimited,
    period,
    usedInPeriod,
    quota,
    remaining,
    periodStart: periodStart.toISOString(),
    periodEnd: periodEnd.toISOString(),
    usedAllTime,
  };
}

/** Batch period usage for admin user list */
export async function sumTokensByUserIdsSince(
  userIds: string[],
  since: Date,
): Promise<Map<string, number>> {
  if (userIds.length === 0) {
    return new Map();
  }
  const rows = await db.aiTokenUsage.groupBy({
    by: ["userId"],
    where: { userId: { in: userIds }, createdAt: { gte: since } },
    _sum: { totalTokens: true },
  });
  const map = new Map<string, number>();
  for (const row of rows) {
    map.set(row.userId, row._sum.totalTokens ?? 0);
  }
  return map;
}

export class AiQuotaExceededError extends Error {
  readonly periodEnd: Date;

  constructor(periodEnd: Date) {
    super("AI token quota exceeded");
    this.name = "AiQuotaExceededError";
    this.periodEnd = periodEnd;
  }
}

export async function assertAiQuotaAvailable(
  user: AiAccessQuotaUserFields & { id: string },
  now = new Date(),
): Promise<void> {
  if (!isAiAssistantAccessActive(user, now)) {
    throw new Error("AI access not granted");
  }
  if (hasUnlimitedAiTokens(user)) {
    return;
  }
  const quota = user.aiTokenQuota;
  if (quota == null) {
    return;
  }
  const period = effectiveAiTokenQuotaPeriod(user);
  const periodStart = getQuotaPeriodStart(period, now);
  const periodEnd = getQuotaPeriodEnd(period, periodStart);
  const used = await sumUserTokensSince(user.id, periodStart);
  if (used >= quota) {
    throw new AiQuotaExceededError(periodEnd);
  }
}

export async function recordAiTokenUsages(
  userId: string,
  usages: GeminiTokenUsage[],
  calculatorId?: string,
): Promise<void> {
  if (usages.length === 0) {
    return;
  }
  await db.aiTokenUsage.createMany({
    data: usages.map((usage) => ({
      userId,
      calculatorId: calculatorId ?? null,
      model: usage.model,
      promptTokens: usage.promptTokens,
      completionTokens: usage.completionTokens,
      totalTokens: usage.totalTokens,
    })),
  });
}

export type AiUsageStats = {
  usedToday: number;
  usedWeek: number;
  usedMonth: number;
  usedAllTime: number;
};

export async function getAiUsageStatsForUser(
  userId: string,
  now = new Date(),
): Promise<AiUsageStats> {
  const dayStart = getQuotaPeriodStart("DAY", now);
  const weekStart = getQuotaPeriodStart("WEEK", now);
  const monthStart = getQuotaPeriodStart("MONTH", now);

  const [usedToday, usedWeek, usedMonth, usedAllTime] = await Promise.all([
    sumUserTokensSince(userId, dayStart),
    sumUserTokensSince(userId, weekStart),
    sumUserTokensSince(userId, monthStart),
    sumUserTokensAllTime(userId),
  ]);

  return { usedToday, usedWeek, usedMonth, usedAllTime };
}

export function isAdminUnlimitedAi(role: Role): boolean {
  return hasStaffPlatformPrivileges(role);
}
