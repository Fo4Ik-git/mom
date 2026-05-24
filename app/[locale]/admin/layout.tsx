import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { PageShell } from "@/app/components/layout/page-shell";
import { Link, redirect } from "@/i18n/navigation";

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

  if (session?.user?.role !== "ADMIN") {
    redirect({ href: "/auth/signin?callbackUrl=/admin", locale });
  }

  const links = [
    { href: "/admin", label: t("overview") },
    { href: "/admin/users", label: t("users") },
    { href: "/admin/calculators", label: t("calculators") },
  ] as const;

  return (
    <PageShell className="max-w-6xl">
      <div className="flex flex-col gap-8 lg:flex-row">
        <aside className="lg:w-52">
          <h1 className="mb-4 text-2xl font-bold">{t("title")}</h1>
          <nav className="flex flex-row flex-wrap gap-1 lg:flex-col">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
              >
                {link.label}
              </Link>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </PageShell>
  );
}
