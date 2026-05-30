import { DynamicCalculator } from "@/app/components/calculator/dynamic-calculator";
import { PageShell } from "@/app/components/layout/page-shell";
import { Button } from "@/app/components/ui/button";
import { auth } from "@/auth";
import { Link, redirect } from "@/i18n/navigation";
import { redirectCalculatorAccessDenied } from "@/lib/calculator/access-denied";
import {
  canEditCalculator,
  getCalculatorAccess,
} from "@/lib/calculator/access";
import {
  calculatorPublicPath,
  findCalculatorByRouteParam,
} from "@/lib/calculator/route";
import { Role } from "@prisma/client";
import { parseCalculatorConfig } from "@/types/calculator";
import { getTranslations, setRequestLocale } from "next-intl/server";
import { notFound } from "next/navigation";

export default async function CalculatorPage({
  params,
}: {
  params: Promise<{ locale: string; id: string }>;
}) {
  const { locale, id: routeParam } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const t = await getTranslations("calculator");

  const calculator = await findCalculatorByRouteParam(routeParam);

  if (!calculator) {
    notFound();
  }

  const userId = session?.user?.id;
  const access = userId
    ? await getCalculatorAccess(
        calculator.id,
        userId,
        session.user.role ?? Role.USER,
      )
    : null;

  const canView =
    calculator.isPublic || calculator.isTemplate || access !== null;

  if (!canView) {
    if (!session?.user) {
      redirect({
        href: `/auth/signin?callbackUrl=${encodeURIComponent(calculatorPublicPath(calculator.id))}`,
        locale,
      });
    }
    redirectCalculatorAccessDenied(locale);
  }

  const showEditLink = access !== null && canEditCalculator(access);

  const config = parseCalculatorConfig(calculator.config);

  return (
    <PageShell width="narrow">
      <div className="mb-8 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{calculator.name}</h1>
          {calculator.description && (
            <p className="mt-2 text-muted-foreground">{calculator.description}</p>
          )}
        </div>
        {showEditLink && (
          <Link href={`/builder/${calculator.id}`}>
            <Button variant="outline">{t("edit")}</Button>
          </Link>
        )}
      </div>
      <DynamicCalculator config={config} />
    </PageShell>
  );
}
