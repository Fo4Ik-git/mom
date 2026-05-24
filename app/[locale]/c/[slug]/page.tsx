import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";
import { auth } from "@/auth";
import { DynamicCalculator } from "@/app/components/calculator/dynamic-calculator";
import { PageShell } from "@/app/components/layout/page-shell";
import { Button } from "@/app/components/ui/button";
import { db } from "@/lib/db";
import { Link } from "@/i18n/navigation";
import { parseCalculatorConfig } from "@/types/calculator";

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ locale: string; slug: string }>;
}) {
  const { locale, slug } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const t = await getTranslations("calculator");

  const calculator = await db.calculator.findUnique({ where: { slug } });

  if (!calculator) {
    notFound();
  }

  const isOwner = session?.user?.id === calculator.userId;
  const canView = calculator.isPublic || calculator.isTemplate || isOwner;

  if (!canView) {
    notFound();
  }

  const config = parseCalculatorConfig(calculator.config);

  return (
    <PageShell className="max-w-2xl">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{calculator.name}</h1>
          {calculator.description && (
            <p className="mt-2 text-muted-foreground">{calculator.description}</p>
          )}
        </div>
        {isOwner && (
          <Link href={`/builder/${calculator.id}`}>
            <Button variant="outline">{t("edit")}</Button>
          </Link>
        )}
      </div>
      <DynamicCalculator config={config} />
    </PageShell>
  );
}
