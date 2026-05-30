"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { useState } from "react";
import { LanguageSwitcher } from "@/app/components/language-switcher";
import { ThemeToggle } from "@/app/components/theme-toggle";
import { Link } from "@/i18n/navigation";

type HeaderNavProps = {
  signedIn: boolean;
  banned: boolean;
  isAdmin: boolean;
};

export function HeaderNav({
  signedIn,
  banned,
  isAdmin,
}: HeaderNavProps) {
  const t = useTranslations("nav");
  const [menuOpen, setMenuOpen] = useState(false);

  const navLinkClass =
    "block rounded-xl px-3 py-2.5 text-sm font-medium transition hover:bg-muted md:inline-block md:py-2";
  const mutedLinkClass = `${navLinkClass} text-muted-foreground`;

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <button
        type="button"
        className="inline-flex size-10 shrink-0 touch-manipulation items-center justify-center rounded-xl border border-border/80 text-foreground md:hidden"
        onClick={() => setMenuOpen((open) => !open)}
        aria-expanded={menuOpen}
        aria-controls="header-mobile-menu"
        aria-label={menuOpen ? t("menuClose") : t("menuOpen")}
      >
        {menuOpen ? (
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
            <path
              d="M6 6l12 12M18 6L6 18"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" className="size-5" aria-hidden>
            <path
              d="M4 7h16M4 12h16M4 17h16"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
      </button>

      <nav
        id="header-mobile-menu"
        className={`${
          menuOpen
            ? "absolute right-2 top-[calc(100%+0.25rem)] z-30 flex w-[min(100vw-1rem,18rem)] flex-col gap-1 rounded-2xl border border-border/80 bg-card/95 p-2 shadow-card-lg backdrop-blur-xl md:static md:flex md:w-auto md:flex-row md:items-center md:gap-1.5 md:border-0 md:bg-transparent md:p-0 md:shadow-none"
            : "hidden md:flex md:flex-row md:items-center md:gap-1.5"
        }`}
      >
        {signedIn ? (
          <>
            <Link href="/docs" className={mutedLinkClass} onClick={closeMenu}>
              {t("docs")}
            </Link>
            {!banned && (
              <Link href="/builder" className={navLinkClass} onClick={closeMenu}>
                {t("builder")}
              </Link>
            )}
            {isAdmin && (
              <Link
                href="/admin"
                className={`${navLinkClass} border border-accent/40 bg-accent-muted text-accent md:border md:px-3`}
                onClick={closeMenu}
              >
                {t("admin")}
              </Link>
            )}
            <button
              type="button"
              className={`${mutedLinkClass} w-full text-left md:w-auto`}
              onClick={() => {
                closeMenu();
                void signOut({ callbackUrl: "/" });
              }}
            >
              {t("signOut")}
            </button>
          </>
        ) : (
          <>
            <Link href="/docs" className={mutedLinkClass} onClick={closeMenu}>
              {t("docs")}
            </Link>
            <Link
              href="/auth/signin"
              className={`${navLinkClass} bg-accent text-accent-foreground hover:brightness-110 md:px-3.5`}
              onClick={closeMenu}
            >
              {t("signIn")}
            </Link>
          </>
        )}
        <div className="flex items-center gap-1 border-t border-border/60 pt-2 md:border-0 md:pt-0">
          <LanguageSwitcher />
          <ThemeToggle />
        </div>
      </nav>
    </>
  );
}
