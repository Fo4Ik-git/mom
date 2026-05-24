import type { AccessExpiryCheckInterval } from "@prisma/client";
import {
  ACCESS_EXPIRY_CHECK_INTERVALS,
  type AccessExpiryCheckIntervalValue,
} from "@/lib/access-expiry-interval";
import { enforceAllExpiredAccess } from "@/lib/enforce-access-expiry";
import { db } from "@/lib/db";
import { getPlatformSettings } from "@/lib/platform-settings";

export { ACCESS_EXPIRY_CHECK_INTERVALS };

const SETTINGS_ID = "default";

const INTERVAL_MS: Record<AccessExpiryCheckIntervalValue, number | null> = {
  OFF: null,
  DAILY: 24 * 60 * 60 * 1000,
  WEEKLY: 7 * 24 * 60 * 60 * 1000,
  MONTHLY: 30 * 24 * 60 * 60 * 1000,
};

export function isAccessExpiryCheckDue(
  interval: AccessExpiryCheckInterval,
  lastRunAt: Date | null,
  now = Date.now(),
): boolean {
  const periodMs = INTERVAL_MS[interval as AccessExpiryCheckIntervalValue];
  if (periodMs === null) {
    return false;
  }
  if (!lastRunAt) {
    return true;
  }
  return now - lastRunAt.getTime() >= periodMs;
}

export async function runAccessExpiryCheck(): Promise<{
  bannedCount: number;
  ranAt: Date;
}> {
  const bannedCount = await enforceAllExpiredAccess();
  const ranAt = new Date();

  await db.platformSettings.update({
    where: { id: SETTINGS_ID },
    data: { accessExpiryCheckLastRunAt: ranAt },
  });

  return { bannedCount, ranAt };
}

export async function runScheduledAccessExpiryCheckIfDue(): Promise<{
  ran: boolean;
  bannedCount: number;
  ranAt: string | null;
}> {
  const settings = await getPlatformSettings();

  if (
    !isAccessExpiryCheckDue(
      settings.accessExpiryCheckInterval,
      settings.accessExpiryCheckLastRunAt,
    )
  ) {
    return {
      ran: false,
      bannedCount: 0,
      ranAt: settings.accessExpiryCheckLastRunAt?.toISOString() ?? null,
    };
  }

  const result = await runAccessExpiryCheck();
  return {
    ran: true,
    bannedCount: result.bannedCount,
    ranAt: result.ranAt.toISOString(),
  };
}
