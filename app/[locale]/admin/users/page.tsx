import { setRequestLocale } from "next-intl/server";
import { AdminUsers } from "@/app/components/admin/admin-users";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  return <AdminUsers />;
}
