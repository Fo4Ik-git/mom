"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/app/components/ui/button";
import { appFetch } from "@/lib/api/api-client";
import { adminApiErrorMessage } from "@/lib/admin/admin-api-error";
import { formatAccessDateShort } from "@/lib/access/access-dates";
import { AI_TOKEN_QUOTA_MAX } from "@/lib/ai/ai-quota-limits";

type AiAccessMode = "OFF" | "PERMANENT" | "UNTIL_DATE" | "DURATION";
type AiTokenQuotaPeriod = "DAY" | "WEEK" | "MONTH";

type AiAdminData = {
  access: {
    mode: AiAccessMode;
    active: boolean;
    expiresAt: string | null;
    grantedAt: string | null;
    durationDays: number | null;
  };
  quota: {
    limit: number | null;
    period: AiTokenQuotaPeriod;
    unlimited: boolean;
    usedInPeriod: number;
    remaining: number | null;
    periodStart: string;
    periodEnd: string;
  };
  usage: {
    usedToday: number;
    usedWeek: number;
    usedMonth: number;
    usedAllTime: number;
  };
  defaults: {
    aiTokenQuota: number | null;
    aiTokenQuotaPeriod: AiTokenQuotaPeriod;
  };
};

export function AdminUserAiSection({ userId }: { userId: string }) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [data, setData] = useState<AiAdminData | null>(null);
  const [mode, setMode] = useState<AiAccessMode>("OFF");
  const [expiresAt, setExpiresAt] = useState("");
  const [durationDays, setDurationDays] = useState("30");
  const [tokenQuota, setTokenQuota] = useState("");
  const [quotaPeriod, setQuotaPeriod] = useState<AiTokenQuotaPeriod>("MONTH");
  const [useDefaultQuota, setUseDefaultQuota] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await appFetch(`/api/admin/users/${userId}/ai`);
    const json = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(adminApiErrorMessage(json, t));
      return;
    }
    const payload = json as AiAdminData;
    setData(payload);
    setMode(payload.access.mode);
    setExpiresAt(
      payload.access.expiresAt
        ? payload.access.expiresAt.slice(0, 10)
        : "",
    );
    setDurationDays(
      payload.access.durationDays != null
        ? String(payload.access.durationDays)
        : "30",
    );
    setTokenQuota(
      payload.quota.limit != null ? String(payload.quota.limit) : "",
    );
    setQuotaPeriod(payload.quota.period);
    setUseDefaultQuota(false);
  }, [userId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save() {
    setSaving(true);
    setError(null);
    const body: Record<string, unknown> = {
      aiAccessMode: mode,
      aiTokenQuotaPeriod: quotaPeriod,
    };

    if (mode === "UNTIL_DATE") {
      body.aiAccessExpiresAt = expiresAt
        ? new Date(`${expiresAt}T23:59:59`).toISOString()
        : null;
    }
    if (mode === "DURATION") {
      body.aiAccessDurationDays = durationDays === "" ? null : Number(durationDays);
    }

    if (useDefaultQuota) {
      body.useDefaultQuota = true;
    } else if (tokenQuota === "") {
      body.aiTokenQuota = null;
    } else {
      const quota = Number(tokenQuota);
      if (!Number.isFinite(quota) || quota < 0 || quota > AI_TOKEN_QUOTA_MAX) {
        setSaving(false);
        setError(t("aiTokenQuotaTooHigh", { max: AI_TOKEN_QUOTA_MAX.toLocaleString() }));
        return;
      }
      body.aiTokenQuota = quota;
    }

    const res = await appFetch(`/api/admin/users/${userId}/ai`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    const json = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(
        json.error === "ai_token_quota_too_high"
          ? t("aiTokenQuotaTooHigh", {
              max: (json.max as number | undefined)?.toLocaleString() ??
                AI_TOKEN_QUOTA_MAX.toLocaleString(),
            })
          : adminApiErrorMessage(json, t),
      );
      return;
    }
    const payload = json as AiAdminData;
    setData((current) => ({
      ...payload,
      defaults: payload.defaults ?? current?.defaults ?? {
        aiTokenQuota: null,
        aiTokenQuotaPeriod: "MONTH",
      },
    }));
    setMode(payload.access.mode);
    if (payload.quota.limit != null) {
      setTokenQuota(String(payload.quota.limit));
    } else if (!useDefaultQuota) {
      setTokenQuota("");
    }
    setQuotaPeriod(payload.quota.period);
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{tc("loading")}</p>;
  }

  if (!data) {
    return error ? (
      <p className="text-sm text-destructive">{error}</p>
    ) : null;
  }

  const inputClass =
    "block h-11 w-full max-w-md rounded-xl border border-border bg-input px-3 text-base sm:text-sm";

  const periodLabel = t(`aiQuotaPeriod_${data.quota.period}`);
  const quotaDisplay = data.quota.unlimited
    ? t("aiQuotaUnlimited")
    : data.quota.limit != null
      ? `${data.quota.usedInPeriod.toLocaleString()} / ${data.quota.limit.toLocaleString()} (${periodLabel})`
      : t("aiQuotaUnlimited");

  return (
    <div className="max-w-lg space-y-5">
      <div className="rounded-xl border border-border/70 bg-muted/20 p-3 text-sm">
        <p className="font-medium text-foreground">{t("aiUsageTitle")}</p>
        <dl className="mt-2 grid grid-cols-2 gap-2 text-xs">
          <div>
            <dt className="text-muted-foreground">{t("aiUsageToday")}</dt>
            <dd className="font-semibold tabular-nums">
              {data.usage.usedToday.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("aiUsageWeek")}</dt>
            <dd className="font-semibold tabular-nums">
              {data.usage.usedWeek.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("aiUsageMonth")}</dt>
            <dd className="font-semibold tabular-nums">
              {data.usage.usedMonth.toLocaleString()}
            </dd>
          </div>
          <div>
            <dt className="text-muted-foreground">{t("aiUsageAllTime")}</dt>
            <dd className="font-semibold tabular-nums">
              {data.usage.usedAllTime.toLocaleString()}
            </dd>
          </div>
        </dl>
        <p className="mt-3 text-xs text-muted-foreground">
          {t("aiQuotaCurrent")}: {quotaDisplay}
        </p>
        {!data.quota.unlimited && data.quota.periodEnd && (
          <p className="mt-1 text-xs text-muted-foreground">
            {t("aiQuotaResetsAt", {
              date: formatAccessDateShort(data.quota.periodEnd, locale),
            })}
          </p>
        )}
      </div>

      <label className="block space-y-1">
        <span className="text-sm font-medium">{t("aiAccessModeLabel")}</span>
        <select
          value={mode}
          onChange={(e) => setMode(e.target.value as AiAccessMode)}
          className={inputClass}
        >
          <option value="OFF">{t("aiAccessMode_OFF")}</option>
          <option value="PERMANENT">{t("aiAccessMode_PERMANENT")}</option>
          <option value="UNTIL_DATE">{t("aiAccessMode_UNTIL_DATE")}</option>
          <option value="DURATION">{t("aiAccessMode_DURATION")}</option>
        </select>
      </label>

      {mode === "UNTIL_DATE" && (
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">
            {t("aiAccessUntil")}
          </span>
          <input
            type="date"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            className={inputClass}
          />
        </label>
      )}

      {mode === "DURATION" && (
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">
            {t("aiAccessDurationDays")}
          </span>
          <input
            type="number"
            min={1}
            value={durationDays}
            onChange={(e) => setDurationDays(e.target.value)}
            className={inputClass}
          />
        </label>
      )}

      <div className="space-y-3 border-t border-border/60 pt-4">
        <p className="text-sm font-semibold">{t("aiTokenQuotaTitle")}</p>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={useDefaultQuota}
            onChange={(e) => setUseDefaultQuota(e.target.checked)}
          />
          {t("aiUseDefaultQuota", {
            quota:
              data.defaults?.aiTokenQuota != null
                ? data.defaults.aiTokenQuota.toLocaleString()
                : t("aiQuotaUnlimited"),
            period: t(
              `aiQuotaPeriod_${data.defaults?.aiTokenQuotaPeriod ?? "MONTH"}`,
            ),
          })}
        </label>
        {!useDefaultQuota && (
          <>
            <label className="block space-y-1">
              <span className="text-sm text-muted-foreground">
                {t("aiTokenQuotaLimit")}
              </span>
              <input
                type="number"
                min={0}
                max={AI_TOKEN_QUOTA_MAX}
                value={tokenQuota}
                onChange={(e) => setTokenQuota(e.target.value)}
                placeholder={t("aiQuotaUnlimited")}
                className={inputClass}
              />
              <p className="text-xs text-muted-foreground">
                {t("aiTokenQuotaMaxHint", {
                  max: AI_TOKEN_QUOTA_MAX.toLocaleString(),
                })}
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-2 h-9 text-xs"
                onClick={() => setTokenQuota("")}
              >
                {t("aiQuotaUnlimited")}
              </Button>
            </label>
            <label className="block space-y-1">
              <span className="text-sm text-muted-foreground">
                {t("aiTokenQuotaPeriod")}
              </span>
              <select
                value={quotaPeriod}
                onChange={(e) =>
                  setQuotaPeriod(e.target.value as AiTokenQuotaPeriod)
                }
                className={inputClass}
              >
                <option value="DAY">{t("aiQuotaPeriod_DAY")}</option>
                <option value="WEEK">{t("aiQuotaPeriod_WEEK")}</option>
                <option value="MONTH">{t("aiQuotaPeriod_MONTH")}</option>
              </select>
            </label>
          </>
        )}
      </div>

      {error && <p className="text-sm text-destructive">{error}</p>}

      <Button type="button" disabled={saving} onClick={() => void save()}>
        {saving ? tc("loading") : t("aiSaveSettings")}
      </Button>
    </div>
  );
}
