import { db } from "@/lib/db";

const SETTINGS_ID = "default";

export async function getPlatformSettings() {
  return db.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    create: {
      id: SETTINGS_ID,
      defaultMaxCalculators: 5,
      defaultAccessDays: 30,
    },
    update: {},
  });
}

export async function updatePlatformSettings(data: {
  defaultMaxCalculators: number;
  defaultAccessDays: number;
  supportEmail?: string | null;
  supportTelegram?: string | null;
}) {
  return db.platformSettings.upsert({
    where: { id: SETTINGS_ID },
    create: { id: SETTINGS_ID, ...data },
    update: data,
  });
}
