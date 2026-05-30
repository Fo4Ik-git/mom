"use client";

import { useTranslations } from "next-intl";
import { Link } from "@/i18n/navigation";

interface DocsHelpLinkProps {
  hash?: string;
  className?: string;
}

export function DocsHelpLink({ hash, className = "" }: DocsHelpLinkProps) {
  const t = useTranslations("builder");
  const href = hash ? `/docs#${hash}` : "/docs";

  return (
    <Link
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border border-border text-sm font-semibold text-muted-foreground transition-colors hover:bg-muted hover:text-foreground ${className}`}
      title={t("codeModeDocsHelp")}
      aria-label={t("codeModeDocsHelp")}
    >
      ?
    </Link>
  );
}
