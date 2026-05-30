"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardTitle } from "@/app/components/ui/card";
import { appFetch } from "@/lib/api/api-client";
import { formatAccessDateShort } from "@/lib/access/access-dates";
import { signupAbsoluteUrl } from "@/lib/auth/signup-url";
import { copyTextToClipboard } from "@/lib/ui/copy-to-clipboard";

type ReferralInfo = {
  code: string;
  signupPath: string;
  label: string | null;
  maxUses: number | null;
  usedCount: number;
  usesLeft: number | null;
  expiresAt: string | null;
  referrerBonusDays: number;
};

export function ReferralCard() {
  const t = useTranslations("home");
  const locale = useLocale();
  const [referral, setReferral] = useState<ReferralInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    appFetch("/api/user/referral")
      .then((res) => res.json())
      .then((data) => {
        setReferral(data.referral ?? null);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading || !referral) {
    return null;
  }

  const link =
    typeof window !== "undefined"
      ? signupAbsoluteUrl(referral.code, window.location.origin)
      : referral.signupPath;

  async function copyLink() {
    const ok = await copyTextToClipboard(link);
    if (!ok) {
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const usesText =
    referral.usesLeft != null
      ? t("referralUsesLeft", {
          left: referral.usesLeft,
          max: referral.maxUses ?? 0,
        })
      : t("referralUsesUnlimited", { used: referral.usedCount });

  return (
    <Card className="border-accent/25 bg-accent/5">
      <CardTitle className="mb-1">{t("referralTitle")}</CardTitle>
      <p className="mb-4 text-sm text-muted-foreground">{t("referralHint")}</p>

      <div className="space-y-3">
        <div className="rounded-xl border border-border/80 bg-card/80 px-3 py-2.5">
          <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
            {t("referralLinkLabel")}
          </p>
          <p className="mt-1 select-all break-all font-mono text-xs sm:text-sm">
            {link}
          </p>
        </div>

        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs text-muted-foreground">{t("referralCode")}</dt>
            <dd className="font-mono font-semibold tracking-wide">{referral.code}</dd>
          </div>
          <div>
            <dt className="text-xs text-muted-foreground">{t("referralUses")}</dt>
            <dd>{usesText}</dd>
          </div>
          {referral.expiresAt && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">{t("referralExpires")}</dt>
              <dd>{formatAccessDateShort(referral.expiresAt, locale)}</dd>
            </div>
          )}
          {referral.referrerBonusDays > 0 && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-muted-foreground">
                {t("referralBonus")}
              </dt>
              <dd>
                {t("referralBonusDays", { days: referral.referrerBonusDays })}
              </dd>
            </div>
          )}
        </dl>

        <Button type="button" variant="primary" onClick={() => void copyLink()}>
          {copied ? t("referralCopied") : t("referralCopy")}
        </Button>
      </div>
    </Card>
  );
}
