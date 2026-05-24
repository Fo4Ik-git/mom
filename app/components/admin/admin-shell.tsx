"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Link, usePathname } from "@/i18n/navigation";

const STORAGE_KEY = "admin-sidebar-collapsed";

export type AdminNavLink = {
  href: "/admin" | "/admin/users" | "/admin/calculators" | "/admin/keys" | "/admin/settings";
  label: string;
};

function NavIcon({ d }: { d: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.75"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="size-5 shrink-0"
      aria-hidden
    >
      <path d={d} />
    </svg>
  );
}

const ICONS: Record<AdminNavLink["href"], string> = {
  "/admin":
    "M3 3h8v8H3zM13 3h8v5h-8zM13 10h8v11h-8zM3 13h8v8H3z",
  "/admin/users": "M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  "/admin/calculators":
    "M4 4h16v16H4zM8 8h8M8 12h8M8 16h5",
  "/admin/keys":
    "M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4",
  "/admin/settings":
    "M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
};

function isActive(pathname: string, href: string) {
  if (href === "/admin") {
    return pathname === "/admin";
  }
  return pathname.startsWith(href);
}

export function AdminShell({
  title,
  links,
  children,
}: {
  title: string;
  links: AdminNavLink[];
  children: React.ReactNode;
}) {
  const t = useTranslations("admin");
  const pathname = usePathname();
  const [collapsed, setCollapsed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    setCollapsed(localStorage.getItem(STORAGE_KEY) === "1");
  }, []);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem(STORAGE_KEY, collapsed ? "1" : "0");
    }
  }, [collapsed, mounted]);

  return (
    <div className="flex flex-col gap-4 lg:flex-row lg:gap-3">
      <aside
        className={`shrink-0 transition-[width] duration-200 ease-out lg:sticky lg:top-24 lg:self-start ${
          collapsed ? "lg:w-14" : "lg:w-44"
        }`}
      >
        <div
          className={`rounded-2xl border border-border/80 bg-card/80 p-2 shadow-sm ${
            collapsed ? "lg:px-1.5" : ""
          }`}
        >
          <div
            className={`mb-2 flex items-center gap-1 ${
              collapsed ? "lg:justify-center" : "lg:justify-between"
            }`}
          >
            {!collapsed && (
              <h1 className="hidden truncate px-1 text-base font-bold lg:block">
                {title}
              </h1>
            )}
            <button
              type="button"
              onClick={() => setCollapsed((c) => !c)}
              className="hidden size-9 shrink-0 items-center justify-center rounded-lg text-muted-foreground transition hover:bg-muted hover:text-foreground lg:inline-flex"
              aria-label={collapsed ? t("navExpand") : t("navCollapse")}
              title={collapsed ? t("navExpand") : t("navCollapse")}
            >
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`size-4 transition-transform ${collapsed ? "rotate-180" : ""}`}
                aria-hidden
              >
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          </div>

          <p className="mb-2 px-1 text-lg font-bold lg:hidden">{title}</p>

          <nav
            className={`flex flex-row flex-wrap gap-1 lg:flex-col ${
              collapsed ? "lg:items-center" : ""
            }`}
          >
            {links.map((link) => {
              const active = isActive(pathname, link.href);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  title={collapsed ? link.label : undefined}
                  className={`flex items-center gap-2.5 rounded-xl text-sm transition ${
                    collapsed
                      ? "lg:size-10 lg:justify-center lg:px-0 lg:py-0"
                      : "px-3 py-2"
                  } ${
                    active
                      ? "bg-accent/15 font-medium text-accent"
                      : "text-muted-foreground hover:bg-muted hover:text-foreground"
                  }`}
                >
                  <NavIcon d={ICONS[link.href]} />
                  <span className={collapsed ? "lg:hidden" : ""}>{link.label}</span>
                </Link>
              );
            })}
          </nav>
        </div>
      </aside>
      <div className="min-w-0 flex-1">{children}</div>
    </div>
  );
}
