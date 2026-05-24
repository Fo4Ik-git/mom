import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { HeaderNav } from "@/app/components/header-nav";
import { contentContainerClass } from "@/app/components/layout/page-shell";
import { Link } from "@/i18n/navigation";
import {
  calculatorPublicPath,
  getMomTemplateCalculator,
} from "@/lib/calculator-route";

export async function Header() {
  const session = await auth();
  const momTemplate = await getMomTemplateCalculator();
  const tc = await getTranslations("common");

  return (
    <header className="sticky top-0 z-20 border-b border-border/60 bg-background/70 backdrop-blur-xl">
      <div className={`${contentContainerClass} relative flex items-center justify-between gap-2 py-2.5 sm:gap-3 sm:py-3`}>
        <Link href="/" className="group flex min-w-0 flex-1 items-center gap-2.5 sm:gap-3">
          <span className="flex size-9 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-accent to-primary text-sm font-bold text-accent-foreground shadow-card sm:size-10">
            M
          </span>
          <span className="min-w-0">
            <span className="block truncate text-base font-bold tracking-tight">
              {tc("appName")}
            </span>
            <span className="hidden text-xs text-muted-foreground sm:block">
              {tc("tagline")}
            </span>
          </span>
        </Link>

        <HeaderNav
          signedIn={Boolean(session?.user)}
          banned={Boolean(session?.user?.banned)}
          isAdmin={session?.user?.role === "ADMIN"}
          templateHref={
            momTemplate ? calculatorPublicPath(momTemplate.id) : null
          }
        />
      </div>
    </header>
  );
}
