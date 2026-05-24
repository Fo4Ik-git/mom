import { setRequestLocale } from "next-intl/server";
import { AdminAccessKeys } from "@/app/components/admin/admin-access-keys";

export default async function AdminKeysPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminAccessKeys />;
}
