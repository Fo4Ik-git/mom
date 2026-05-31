import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { CalculatorBuilder } from "@/app/components/builder/calculator-builder";
import { PageShell } from "@/app/components/layout/page-shell";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";
import { db } from "@/lib/platform/db";
import { isAccessActive } from "@/lib/access/user-limits";
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

  const t = await getTranslations("builder");

  return (
    <PageShell width="full">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">{t("newTitle")}</h1>
      <CalculatorBuilder
        initialConfig={emptyCalculatorConfig}
        isAdmin={user?.role === Role.ADMIN}
      />
    </PageShell>
  );
}
