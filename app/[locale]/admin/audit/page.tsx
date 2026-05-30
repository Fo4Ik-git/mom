import { setRequestLocale } from "next-intl/server";
import { AdminLogsViewer } from "@/app/components/admin/admin-logs";

export default async function AdminAuditPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminLogsViewer />;
}
