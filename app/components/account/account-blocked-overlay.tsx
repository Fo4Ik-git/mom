"use client";

import { signOut } from "next-auth/react";
import { useTranslations } from "next-intl";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import type { BanReason } from "@prisma/client";

export function AccountBlockedOverlay({
  banReason,
  supportEmail,
  supportTelegram,
}: {
  banReason: BanReason | null;
  supportEmail: string | null;
  supportTelegram: string | null;
}) {
  const t = useTranslations("blocked");
  const ta = useTranslations("auth");

  const reasonKey = banReason
    ? (`banReason_${banReason}` as "banReason_ACCESS_EXPIRED")
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-md">
      <Card className="w-full max-w-md p-6 shadow-xl">
        <h2 className="text-xl font-bold tracking-tight">{t("title")}</h2>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
          {reasonKey ? ta(reasonKey) : ta("bannedGeneric")}
        </p>

        {(supportEmail || supportTelegram) && (
          <div className="mt-5 rounded-xl border border-border bg-muted/30 p-4">
            <p className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              {t("contactTitle")}
            </p>
            <ul className="mt-2 space-y-1.5 text-sm">
              {supportEmail && (
                <li>
                  <a
                    href={`mailto:${supportEmail}`}
                    className="font-medium text-accent underline"
                  >
                    {supportEmail}
                  </a>
                </li>
              )}
              {supportTelegram && (
                <li>
                  <span className="text-muted-foreground">{t("telegram")}: </span>
                  <span className="font-medium">{supportTelegram}</span>
                </li>
              )}
            </ul>
          </div>
        )}

        {!supportEmail && !supportTelegram && (
          <p className="mt-4 text-sm text-muted-foreground">{t("noContact")}</p>
        )}

        <Button
          type="button"
          variant="outline"
          className="mt-6 w-full"
          onClick={() => signOut({ callbackUrl: "/auth/signin" })}
        >
          {t("signOut")}
        </Button>
      </Card>
    </div>
  );
}
