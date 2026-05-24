"use client";

import { useLocale } from "next-intl";
import { usePathname, useRouter } from "@/i18n/navigation";
import { routing, type Locale } from "@/i18n/routing";

const labels: Record<Locale, string> = {
  uk: "UA",
  en: "EN",
};

export function LanguageSwitcher() {
  const locale = useLocale() as Locale;
  const router = useRouter();
  const pathname = usePathname();

  function switchLocale(nextLocale: Locale) {
    if (nextLocale === locale) {
      return;
    }
    router.replace(pathname, { locale: nextLocale });
  }

  return (
    <div
      className="flex rounded-full border border-border bg-card/80 p-0.5 text-xs font-semibold shadow-sm"
      role="group"
      aria-label="Language"
    >
      {routing.locales.map((loc) => (
        <button
          key={loc}
          type="button"
          onClick={() => switchLocale(loc)}
          className={`min-w-9 rounded-full px-2.5 py-1.5 transition ${
            locale === loc
              ? "bg-accent text-accent-foreground shadow-sm"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {labels[loc]}
        </button>
      ))}
    </div>
  );
}
