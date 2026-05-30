import { NotFoundPage } from "@/app/components/errors/not-found-page";

/** Fallback when the URL has no locale segment. */
export default function RootNotFound() {
  return (
    <NotFoundPage
      title="Сторінку не знайдено"
      subtitle="Формула зникла в невідомій галактиці чисел"
      hint="Перевірте посилання або поверніться на головну."
      equation="результат = ??? / URL"
      homeLabel="На головну"
      docsLabel="Довідка"
    />
  );
}
