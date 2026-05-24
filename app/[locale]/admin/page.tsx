import { setRequestLocale } from "next-intl/server";
import { AdminStats } from "@/app/components/admin/admin-stats";

export default async function AdminPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminStats />;
}
