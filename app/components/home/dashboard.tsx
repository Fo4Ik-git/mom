"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Card } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { Link } from "@/i18n/navigation";
import { appFetch } from "@/lib/api-client";
import { formatAccessDate, getDaysUntilExpiry } from "@/lib/access-display";
import { calculatorPublicPath } from "@/lib/calculator-route";

interface CalculatorSummary {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
  updatedAt: string;
}

interface Quota {
  current: number;
  max: number | null;
  canCreate: boolean;
  accessActive: boolean;
  accessExpiresAt: string | null;
  role: "USER" | "ADMIN";
}

export function Dashboard() {
  const t = useTranslations("home");
  const tc = useTranslations("common");
  const tl = useTranslations("limits");
  const locale = useLocale();
  const [calculators, setCalculators] = useState<CalculatorSummary[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      appFetch("/api/calculators").then((res) => res.json()),
      appFetch("/api/user/quota").then((res) => res.json()),
    ])
      .then(([calcData, quotaData]) => {
        setCalculators(calcData.calculators ?? []);
        if (typeof quotaData.current === "number") {
          setQuota(quotaData);
        }
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return <p className="text-muted-foreground">{tc("loading")}</p>;
  }

  const quotaLabel =
    quota &&
    (quota.max == null
      ? tl("quotaUnlimited", { current: quota.current })
      : tl("quota", { current: quota.current, max: quota.max }));

  const daysLeft =
    quota?.accessExpiresAt && quota.accessActive
      ? getDaysUntilExpiry(quota.accessExpiresAt)
      : null;

  const accessUrgent = daysLeft != null && daysLeft <= 7;

  return (
    <div className="space-y-6">
      {quota && (
        <div className="grid gap-3 sm:grid-cols-2">
          <Card
            className={`p-4 ${
              !quota.accessActive && quota.role !== "ADMIN"
                ? "border-destructive/40 bg-destructive/5"
                : accessUrgent
                  ? "border-amber-500/40 bg-amber-500/5"
                  : "border-accent/20 bg-accent/5"
            }`}
          >
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {tl("accessStatus")}
            </p>
            {quota.role === "ADMIN" ? (
              <p className="mt-1 text-lg font-semibold">{tl("accessAdmin")}</p>
            ) : !quota.accessExpiresAt ? (
              <p className="mt-1 text-lg font-semibold">{tl("accessUnlimitedTime")}</p>
            ) : !quota.accessActive ? (
              <p className="mt-1 text-lg font-semibold text-destructive">
                {tl("accessExpired")}
              </p>
            ) : (
              <>
                <p className="mt-1 text-lg font-semibold">
                  {tl("accessUntil", {
                    date: formatAccessDate(quota.accessExpiresAt, locale),
                  })}
                </p>
                <p
                  className={`mt-0.5 text-sm ${
                    accessUrgent ? "font-medium text-amber-700 dark:text-amber-300" : "text-muted-foreground"
                  }`}
                >
                  {tl("accessDaysLeft", { days: Math.max(0, daysLeft ?? 0) })}
                </p>
              </>
            )}
          </Card>

          <Card className="border-border/80 p-4">
            <p className="text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
              {tl("calculatorsStatus")}
            </p>
            <p className="mt-1 text-lg font-semibold tabular-nums">
              {quotaLabel ?? "—"}
            </p>
          </Card>
        </div>
      )}
      <div className="flex flex-wrap gap-3">
        <Link href={quota?.accessActive !== false ? "/builder" : "#"}>
          <Button disabled={quota?.accessActive === false || quota?.canCreate === false}>
            {t("createNew")}
          </Button>
        </Link>
      </div>

      {calculators.length === 0 ? (
        <p className="text-muted-foreground">{t("emptyList")}</p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {calculators.map((calculator) => (
            <li key={calculator.id}>
              <Card className="flex h-full flex-col">
                <h3 className="font-semibold">{calculator.name}</h3>
                <p className="mt-1 text-xs text-muted-foreground">
                  {calculator.isPublic ? tc("public") : tc("private")}
                </p>
                <div className="mt-4 flex gap-3 text-sm">
                  <Link
                    href={calculatorPublicPath(calculator.id)}
                    className="font-medium text-accent underline"
                  >
                    {tc("open")}
                  </Link>
                  <Link
                    href={`/builder/${calculator.id}`}
                    className="text-muted-foreground underline"
                  >
                    {tc("edit")}
                  </Link>
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
