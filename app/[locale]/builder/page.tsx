import { getTranslations, setRequestLocale } from "next-intl/server";
import { auth } from "@/auth";
import { redirect } from "@/i18n/navigation";
import { CalculatorBuilder } from "@/app/components/builder/calculator-builder";
import { PageShell } from "@/app/components/layout/page-shell";
import { emptyCalculatorConfig } from "@/lib/calculator/defaults";

export default async function NewBuilderPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);

  const session = await auth();
  if (!session?.user) {
    redirect({ href: "/auth/signin?callbackUrl=/builder", locale });
  }

  const t = await getTranslations("builder");

  return (
    <PageShell className="max-w-6xl">
      <h1 className="mb-8 text-3xl font-bold tracking-tight">{t("newTitle")}</h1>
      <CalculatorBuilder initialConfig={emptyCalculatorConfig} />
    </PageShell>
  );
}
