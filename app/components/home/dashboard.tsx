"use client";

import { Button } from "@/app/components/ui/button";
import { Card } from "@/app/components/ui/card";
import { Link } from "@/i18n/navigation";
import { formatAccessDate, getDaysUntilExpiry } from "@/lib/access/access-display";
import { appFetch } from "@/lib/api/api-client";
import { calculatorPublicPath } from "@/lib/calculator/route";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";

interface CalculatorSummary {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
  updatedAt: string;
  isOwner?: boolean;
  canEdit?: boolean;
  accessKind?: string;
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
  const ts = useTranslations("sharing");
  const tl = useTranslations("limits");
  const locale = useLocale();
  const [calculators, setCalculators] = useState<CalculatorSummary[]>([]);
  const [quota, setQuota] = useState<Quota | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const refreshQuota = useCallback(async () => {
    const quotaRes = await appFetch("/api/user/quota");
    const quotaData = await quotaRes.json();
    if (typeof quotaData.current === "number") {
      setQuota(quotaData);
    }
  }, []);

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

  async function removeCalculator(id: string, name: string) {
    if (!confirm(t("deleteConfirm", { name }))) {
      return;
    }

    setDeleteError(null);
    setDeletingId(id);

    const response = await appFetch(`/api/calculators/${id}`, {
      method: "DELETE",
    });

    setDeletingId(null);

    if (!response.ok) {
      setDeleteError(t("deleteFailed"));
      return;
    }

    setCalculators((current) => current.filter((item) => item.id !== id));
    await refreshQuota();
  }

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
      {deleteError && (
        <p className="rounded-xl border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {deleteError}
        </p>
      )}

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
                  {calculator.isOwner === false && (
                    <span className="ml-2 rounded-md bg-muted px-1.5 py-0.5">
                      {calculator.canEdit ? ts("sharedEdit") : ts("sharedView")}
                    </span>
                  )}
                </p>
                <div className="mt-4 flex flex-wrap items-center gap-3 text-sm">
                  <Link
                    href={calculatorPublicPath(calculator.id)}
                    className="font-medium text-accent underline"
                  >
                    {tc("open")}
                  </Link>
                  {calculator.canEdit !== false && (
                    <Link
                      href={`/builder/${calculator.id}`}
                      className="text-muted-foreground underline"
                    >
                      {tc("edit")}
                    </Link>
                  )}
                  {calculator.isOwner !== false && (
                    <button
                      type="button"
                      onClick={() => removeCalculator(calculator.id, calculator.name)}
                      disabled={deletingId === calculator.id}
                      className="text-destructive hover:underline disabled:opacity-50"
                    >
                      {deletingId === calculator.id ? tc("loading") : tc("delete")}
                    </button>
                  )}
                </div>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
