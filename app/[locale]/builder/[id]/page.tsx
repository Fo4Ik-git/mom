import { CalculatorBuilder } from "@/app/components/builder/calculator-builder";
import { PageShell } from "@/app/components/layout/page-shell";
import { NavButton } from "@/app/components/ui/nav-button";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { redirectCalculatorAccessDenied } from "@/lib/calculator/access-denied";
import {
  canEditCalculator,
  getCalculatorAccess,
} from "@/lib/calculator/access";
import { calculatorPublicPath } from "@/lib/calculator/paths";
import { isAccessActive } from "@/lib/access/user-limits";
import { getAiQuotaSnapshot } from "@/lib/ai/ai-quota";
import {
  canShowAiInBuilder,
  loadAiUserForSession,
} from "@/lib/ai/handle-generate-calculator-request";
import { db } from "@/lib/platform/db";
import { Role } from "@prisma/client";
import { parseCalculatorConfig } from "@/types/calculator";
import { getTranslations, setRequestLocale } from "next-intl/server";

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

  const access = await getCalculatorAccess(
    id,
    userId!,
    session!.user.role ?? Role.USER,
  );

  if (!access) {
    redirectCalculatorAccessDenied(locale);
    return null;
  }

  const readOnly = !canEditCalculator(access);
  const canManageShares =
    access.kind === "owner" || access.kind === "admin";

  const aiUser = await loadAiUserForSession({
    id: userId!,
    role: session!.user.role ?? Role.USER,
  });
  const canUseAi = canShowAiInBuilder(aiUser) && !readOnly;
  const initialAiQuota =
    aiUser && canUseAi ? await getAiQuotaSnapshot(aiUser) : null;

  const t = await getTranslations("builder");

  return (
    <PageShell width="full">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{t("editTitle")}</h1>
          {readOnly && (
            <p className="mt-1 text-sm text-muted-foreground">{t("readOnlyHint")}</p>
          )}
          {access.kind === "admin" && (
            <p className="mt-1 text-sm text-amber-700 dark:text-amber-300">
              {t("adminEditHint")}
            </p>
          )}
        </div>
        <NavButton
          href={calculatorPublicPath(access.calculator.id)}
          variant="outline"
          className="h-9 px-3 text-sm"
        >
          {t("openCalculator")}
        </NavButton>
      </div>
      <CalculatorBuilder
        calculatorId={access.calculator.id}
        initialName={access.calculator.name}
        initialDescription={access.calculator.description ?? ""}
        initialConfig={parseCalculatorConfig(access.calculator.config)}
        initialIsPublic={access.calculator.isPublic}
        readOnly={readOnly}
        canManageShares={canManageShares}
        apiBase={
          access.kind === "admin" ? "/api/admin/calculators" : "/api/calculators"
        }
        canUseAi={canUseAi}
        initialAiQuota={initialAiQuota}
      />
    </PageShell>
  );
}
