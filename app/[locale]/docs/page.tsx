import { getTranslations, setRequestLocale } from "next-intl/server";
import { FormulaDocsView } from "@/app/components/docs/formula-docs-view";
import { PageShell } from "@/app/components/layout/page-shell";
import { collectFormulaDocs } from "@/lib/formula/docs/collect-formula-docs";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "docs" });
  return {
    title: t("pageTitle"),
    description: t("pageDescription"),
  };
}

export default async function DocsPage({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  setRequestLocale(locale);
  const t = await getTranslations("docs");
  const data = collectFormulaDocs();

  return (
    <PageShell>
      <header className="mb-6 sm:mb-8">
        <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-accent">
          {t("pageEyebrow")}
        </p>
        <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">{t("pageTitle")}</h1>
        <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted-foreground">
          {t("pageDescription")}
        </p>
      </header>
      <FormulaDocsView data={data} />
    </PageShell>
  );
}
