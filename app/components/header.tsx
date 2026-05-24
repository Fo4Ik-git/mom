import { getTranslations } from "next-intl/server";
import { auth, signOut } from "@/auth";
import { LanguageSwitcher } from "@/app/components/language-switcher";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { Link } from "@/i18n/navigation";
import {
  calculatorPublicPath,
  getMomTemplateCalculator,
} from "@/lib/calculator-route";

export async function Header() {
  const session = await auth();
  const momTemplate = await getMomTemplateCalculator();
  const t = await getTranslations("nav");
  const tc = await getTranslations("common");

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3 sm:px-6">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <span className="flex size-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-primary text-sm font-bold text-accent-foreground shadow-card">
            M
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold tracking-tight">
              {tc("appName")}
            </span>
            <span className="block text-xs text-muted-foreground">
              {tc("tagline")}
            </span>
          </span>
        </Link>

        <nav className="flex items-center gap-1.5 sm:gap-2">
          {momTemplate && (
            <Link
              href={calculatorPublicPath(momTemplate.id)}
              className="hidden rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground sm:inline"
            >
              {t("templateMom")}
            </Link>
          )}
          {session?.user ? (
            <>
              <Link
                href="/builder"
                className="rounded-xl px-3 py-2 text-sm font-medium transition hover:bg-muted"
              >
                {t("builder")}
              </Link>
              {session.user.role === "ADMIN" && (
                <Link
                  href="/admin"
                  className="rounded-xl px-3 py-2 text-sm font-medium text-accent transition hover:bg-accent-muted"
                >
                  {t("admin")}
                </Link>
              )}
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/" });
                }}
              >
                <button
                  type="submit"
                  className="rounded-xl px-3 py-2 text-sm text-muted-foreground transition hover:bg-muted hover:text-foreground"
                >
                  {t("signOut")}
                </button>
              </form>
            </>
          ) : (
            <Link
              href="/auth/signin"
              className="rounded-xl bg-accent px-3.5 py-2 text-sm font-semibold text-accent-foreground shadow-sm transition hover:brightness-110"
            >
              {t("signIn")}
            </Link>
          )}
          <LanguageSwitcher />
          <ThemeToggle />
        </nav>
      </div>
    </header>
  );
}
