import { NotFoundPage } from "@/app/components/errors/not-found-page";
import {
  getLocale,
  getTranslations,
  setRequestLocale,
} from "next-intl/server";

export default async function LocaleNotFound() {
  const locale = await getLocale();
  setRequestLocale(locale);
  const t = await getTranslations("notFound");

  return (
    <NotFoundPage
      title={t("title")}
      subtitle={t("subtitle")}
      hint={t("hint")}
      equation={t("equation")}
      homeLabel={t("home")}
      docsLabel={t("docs")}
    />
  );
}
