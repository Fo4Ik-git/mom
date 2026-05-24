import type { Locale } from "./routing";

export function stripLocalePrefix(pathname: string): {
  locale: Locale;
  pathname: string;
} {
  if (pathname === "/en" || pathname.startsWith("/en/")) {
    return {
      locale: "en",
      pathname: pathname.replace(/^\/en/, "") || "/",
    };
  }
  return { locale: "uk", pathname };
}

export function withLocalePath(path: string, locale: Locale): string {
  if (locale === "en") {
    return path === "/" ? "/en" : `/en${path}`;
  }
  return path;
}
