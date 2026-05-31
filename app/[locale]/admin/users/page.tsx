import { setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { AdminUsers } from "@/app/components/admin/admin-users";

export default async function AdminUsersPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const session = await auth();
  const actorRole = session?.user?.role ?? "USER";
  const actorUserId = session?.user?.id ?? "";

  return <AdminUsers actorRole={actorRole} actorUserId={actorUserId} />;
}
