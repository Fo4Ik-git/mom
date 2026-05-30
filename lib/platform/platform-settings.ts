import type { AccessExpiryCheckInterval } from "@prisma/client";
import { DEFAULT_ACCESS_EXPIRY_CHECK_INTERVAL } from "@/lib/access/access-expiry-interval";
import { db } from "@/lib/platform/db";

const SETTINGS_ID = "default";

export async function getPlatformSettings() {
  return db.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      defaultMaxCalculators: 5,
      defaultAccessDays: 30,
      defaultReferrerBonusDays: 0,
      accessExpiryCheckInterval: DEFAULT_ACCESS_EXPIRY_CHECK_INTERVAL,
    },
    update: {},
  });
}

export async function updatePlatformSettings(data: {
  defaultMaxCalculators: number;
  defaultAccessDays: number;
  defaultReferrerBonusDays?: number;
  supportEmail?: string | null;
  supportTelegram?: string | null;
  accessExpiryCheckInterval?: AccessExpiryCheckInterval;
}) {
  return db.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });
}
