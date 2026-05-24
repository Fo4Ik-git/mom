import { getPlatformSettings } from "@/lib/platform-settings";

export interface SupportContact {
  email: string | null;
  telegram: string | null;
}

export async function getSupportContact(): Promise<SupportContact> {
  const settings = await getPlatformSettings();
  return {
    email: settings.supportEmail,
    telegram: settings.supportTelegram,
  };
}
