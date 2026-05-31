import en from "@/messages/en.json";
import uk from "@/messages/uk.json";

const catalogs = { en, uk } as const;

export type AppLocale = keyof typeof catalogs;

function resolvePath(obj: unknown, path: string): unknown {
  let cur: unknown = obj;
  for (const part of path.split(".")) {
    if (cur == null || typeof cur !== "object") {
      return undefined;
    }
    cur = (cur as Record<string, unknown>)[part];
  }
  return cur;
}

/** Read docs copy without ICU parsing (safe for `{`, markdown, code blocks). */
export function getRawDocMessage(
  locale: string,
  path: string,
): string | undefined {
  const catalog = catalogs[locale as AppLocale] ?? catalogs.en;
  const value = resolvePath(catalog, path.startsWith("docs.") ? path : `docs.${path}`);
  return typeof value === "string" ? value : undefined;
}

export function hasRawDocMessage(locale: string, path: string): boolean {
  return getRawDocMessage(locale, path) != null;
}
