import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { AdminShell, type AdminNavLink } from "@/app/components/admin/admin-shell";
import { PageShell } from "@/app/components/layout/page-shell";
import { redirect } from "@/i18n/navigation";

export default async function AdminLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const t = await getTranslations("admin");

  const role = session?.user?.role;
  if (role !== "ADMIN" && role !== "SUPERADMIN") {
    redirect({ href: "/auth/signin?callbackUrl=/admin", locale });
  }

  const links: AdminNavLink[] = [
    { href: "/admin", label: t("overview") },
    { href: "/admin/users", label: t("users") },
    { href: "/admin/calculators", label: t("calculators") },
    { href: "/admin/keys", label: t("referralsNav") },
    { href: "/admin/audit", label: t("logsNav") },
    { href: "/admin/settings", label: t("settings") },
  ];

  return (
    <PageShell width="full">
      <AdminShell title={t("title")} links={links}>
        {children}
      </AdminShell>
    </PageShell>
  );
}
