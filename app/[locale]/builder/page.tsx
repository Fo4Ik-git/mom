import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { CalculatorBuilder } from "@/app/components/builder/calculator-builder";
import { PageShell } from "@/app/components/layout/page-shell";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { db } from "@/lib/platform/db";
import { isAccessActive } from "@/lib/access/user-limits";
import { getAiQuotaSnapshot } from "@/lib/ai/ai-quota";
import {
  canShowAiInBuilder,
  loadAiUserForSession,
} from "@/lib/ai/handle-generate-calculator-request";
import { Role } from "@prisma/client";

export default async function NewBuilderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    redirect({ href: "/auth/signin?callbackUrl=/builder", locale });
  }

  const user = await db.user.findUnique({ where: { id: userId } });
  if (user && !isAccessActive(user)) {
    redirect({ href: "/", locale });
  }

  const aiUser = await loadAiUserForSession({
    id: userId!,
    role: session!.user.role ?? Role.USER,
  });
  const canUseAi = canShowAiInBuilder(aiUser);
  const initialAiQuota =
    aiUser && canUseAi ? await getAiQuotaSnapshot(aiUser) : null;

  const t = await getTranslations("builder");

  return (
    <PageShell width="full">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">{t("newTitle")}</h1>
      <CalculatorBuilder
        initialConfig={emptyCalculatorConfig}
        canUseAi={canUseAi}
        initialAiQuota={initialAiQuota}
      />
    </PageShell>
  );
}
