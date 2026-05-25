import { CalculatorBuilder } from "@/app/components/builder/calculator-builder";
import { PageShell } from "@/app/components/layout/page-shell";
import { auth } from "@/auth";
import { Link, redirect } from "@/i18n/navigation";
import { calculatorPublicPath } from "@/lib/calculator-route";
import { db } from "@/lib/db";
import { isAccessActive } from "@/lib/user-limits";
import { parseCalculatorConfig } from "@/types/calculator";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function EditBuilderPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect({ href: `/auth/signin?callbackUrl=/builder/${id}`, locale });
  }

  const owner = await db.user.findUnique({ where: { id: userId } });
  if (owner && !isAccessActive(owner)) {
    redirect({ href: "/", locale });
  }

  const calculator = await db.calculator.findFirst({
    where: { id, userId },
  });

  if (!calculator || calculator.isTemplate) {
    notFound();
  }

  const t = await getTranslations("builder");

  return (
    <PageShell width="full">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-3xl font-bold tracking-tight">{t("editTitle")}</h1>
        <Link
          href={calculatorPublicPath(calculator.id)}
          className="text-sm font-medium text-accent underline"
        >
          {t("openCalculator")}
        </Link>
      </div>
      <CalculatorBuilder
        calculatorId={calculator.id}
        initialName={calculator.name}
        initialDescription={calculator.description ?? ""}
        initialConfig={parseCalculatorConfig(calculator.config)}
        initialIsPublic={calculator.isPublic}
      />
    </PageShell>
  );
}
