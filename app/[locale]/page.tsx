import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { Dashboard } from "@/app/components/home/dashboard";
import { PageShell } from "@/app/components/layout/page-shell";
import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Link } from "@/i18n/navigation";

export default async function HomePage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const t = await getTranslations("home");

  return (
    <PageShell>
      <Card className="relative mb-10 overflow-hidden border-accent/20 bg-gradient-to-br from-card via-card to-accent-muted/30">
        <div className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative">
          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
            Mom
          </p>
          <h2 className="max-w-xl text-3xl font-bold tracking-tight sm:text-4xl">
            {t("heroTitle")}
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-muted-foreground">
            {t("heroSubtitle")}
          </p>
          {!session?.user && (
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/auth/signup">
                <Button>{t("ctaStart")}</Button>
              </Link>
              <Link href="/c/mom">
                <Button variant="outline">{t("ctaDemo")}</Button>
              </Link>
            </div>
          )}
        </div>
      </Card>

      {session?.user ? (
        <>
          <h3 className="mb-5 text-xl font-semibold">{t("myCalculators")}</h3>
          <Dashboard />
        </>
      ) : (
        <p className="text-muted-foreground">
          <Link href="/auth/signin" className="font-medium text-accent underline">
            {t("signInPrompt")}
          </Link>
          {t("signInSuffix")}
        </p>
      )}
    </PageShell>
  );
}
