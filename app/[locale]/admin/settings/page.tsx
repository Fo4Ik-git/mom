import { setRequestLocale } from "next-intl/server";
import { AdminPlatformSettings } from "@/app/components/admin/admin-settings";

export default async function AdminSettingsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminPlatformSettings />;
}
