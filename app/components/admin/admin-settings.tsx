"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { AdminErrorAlert } from "@/app/components/admin/admin-error-alert";
import { appFetch } from "@/lib/api/api-client";
import { adminApiErrorMessage } from "@/lib/admin/admin-api-error";
import {
  ACCESS_EXPIRY_CHECK_INTERVALS,
  DEFAULT_ACCESS_EXPIRY_CHECK_INTERVAL,
  type AccessExpiryCheckIntervalValue,
} from "@/lib/access/access-expiry-interval";

export function AdminPlatformSettings() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [defaultMax, setDefaultMax] = useState(5);
  const [defaultAccessDays, setDefaultAccessDays] = useState(30);
  const [defaultReferrerBonusDays, setDefaultReferrerBonusDays] = useState(0);
  const [supportEmail, setSupportEmail] = useState("");
  const [supportTelegram, setSupportTelegram] = useState("");
  const [accessExpiryInterval, setAccessExpiryInterval] =
    useState<AccessExpiryCheckIntervalValue>(DEFAULT_ACCESS_EXPIRY_CHECK_INTERVAL);
  const [accessExpiryLastRunAt, setAccessExpiryLastRunAt] = useState<
    string | null
  >(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checkRunning, setCheckRunning] = useState(false);
  const [checkMessage, setCheckMessage] = useState<string | null>(null);
  const [checkError, setCheckError] = useState<string | null>(null);

  async function runScheduledCheckIfDue() {
    const statusRes = await appFetch("/api/admin/access-expiry-check");
    const status = await statusRes.json();
    if (!statusRes.ok) {
      return;
    }
    if (status.ranAt) {
      setAccessExpiryLastRunAt(status.ranAt);
    }
    if (!status.due) {
      return;
    }

    const response = await appFetch("/api/admin/access-expiry-check", {
      method: "POST",
      body: JSON.stringify({ scheduled: true }),
    });
    const data = await response.json();
    if (!response.ok) {
      return;
    }
    if (data.ranAt) {
      setAccessExpiryLastRunAt(data.ranAt);
    }
    if (data.ran && typeof data.bannedCount === "number") {
      setCheckMessage(
        t("accessExpiryCheckAutoDone", { count: data.bannedCount }),
      );
    }
  }

  useEffect(() => {
    appFetch("/api/admin/settings")
      .then(async (res) => {
        const data = await res.json();
        if (!res.ok) {
          setLoadError(adminApiErrorMessage(data, t));
          return;
        }
        if (typeof data.defaultMaxCalculators === "number") {
          setDefaultMax(data.defaultMaxCalculators);
        }
        if (typeof data.defaultAccessDays === "number") {
          setDefaultAccessDays(data.defaultAccessDays);
        }
        if (typeof data.defaultReferrerBonusDays === "number") {
          setDefaultReferrerBonusDays(data.defaultReferrerBonusDays);
        }
        setSupportEmail(data.supportEmail ?? "");
        setSupportTelegram(data.supportTelegram ?? "");
        if (data.accessExpiryCheckInterval) {
          setAccessExpiryInterval(data.accessExpiryCheckInterval);
        }
        setAccessExpiryLastRunAt(data.accessExpiryCheckLastRunAt ?? null);
        await runScheduledCheckIfDue();
      })
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [t]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    const response = await appFetch("/api/admin/settings", {
      method: "PATCH",
      body: JSON.stringify({
        defaultMaxCalculators: defaultMax,
        defaultAccessDays,
        defaultReferrerBonusDays,
        supportEmail: supportEmail.trim() || null,
        supportTelegram: supportTelegram.trim() || null,
        accessExpiryCheckInterval: accessExpiryInterval,
      }),
    });
    const data = await response.json();
    setSaving(false);
    if (response.ok) {
      setSaved(true);
      if (data.accessExpiryCheckLastRunAt !== undefined) {
        setAccessExpiryLastRunAt(data.accessExpiryCheckLastRunAt);
      }
      return;
    }
    setSaveError(adminApiErrorMessage(data, t));
  }

  async function handleRunAccessExpiryCheck() {
    setCheckRunning(true);
    setCheckMessage(null);
    setCheckError(null);
    const response = await appFetch("/api/admin/access-expiry-check", {
      method: "POST",
    });
    const data = await response.json();
    setCheckRunning(false);
    if (!response.ok) {
      setCheckError(adminApiErrorMessage(data, t));
      return;
    }
    if (data.ranAt) {
      setAccessExpiryLastRunAt(data.ranAt);
    }
    const count = data.bannedCount ?? 0;
    setCheckMessage(
      count > 0
        ? t("accessExpiryCheckDone", { count })
        : t("accessExpiryCheckNone"),
    );
  }

  function formatLastRun(iso: string | null): string {
    if (!iso) {
      return t("accessExpiryCheckNever");
    }
    return new Date(iso).toLocaleString();
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{tc("loading")}</p>;
  }

  return (
    <div className="space-y-6">
      <Card>
        <AdminErrorAlert message={loadError ?? saveError} />
        <CardTitle className="mb-2">{t("platformSettings")}</CardTitle>
        <p className="mb-4 text-sm text-muted-foreground">
          {t("platformSettingsHint")}
        </p>
        <div className="mb-6 space-y-4 border-b border-border/60 pb-6">
          <p className="text-sm font-semibold">{t("supportContactTitle")}</p>
          <p className="text-sm text-muted-foreground">
            {t("supportContactHint")}
          </p>
          <div className="flex max-w-sm flex-col gap-4">
            <label className="space-y-1.5">
              <span className="text-sm text-muted-foreground">
                {t("supportEmail")}
              </span>
              <input
                type="email"
                value={supportEmail}
                onChange={(e) => setSupportEmail(e.target.value)}
                placeholder="support@example.com"
                className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
              />
            </label>
            <label className="space-y-1.5">
              <span className="text-sm text-muted-foreground">
                {t("supportTelegram")}
              </span>
              <input
                type="text"
                value={supportTelegram}
                onChange={(e) => setSupportTelegram(e.target.value)}
                placeholder="@username"
                className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
              />
            </label>
          </div>
        </div>
        <div className="flex max-w-sm flex-col gap-4">
          <label className="space-y-1.5">
            <span className="text-sm text-muted-foreground">
              {t("defaultMaxCalculators")}
            </span>
            <input
              type="number"
              min={0}
              max={1000}
              value={defaultMax}
              onChange={(e) => setDefaultMax(Number(e.target.value) || 0)}
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm text-muted-foreground">
              {t("defaultAccessDays")}
            </span>
            <input
              type="number"
              min={0}
              max={3650}
              value={defaultAccessDays}
              onChange={(e) =>
                setDefaultAccessDays(Number(e.target.value) || 0)
              }
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
            />
            <span className="text-xs text-muted-foreground">
              {t("defaultAccessDaysHint")}
            </span>
          </label>
          <label className="space-y-1.5">
            <span className="text-sm text-muted-foreground">
              {t("defaultReferrerBonusDays")}
            </span>
            <input
              type="number"
              min={0}
              max={3650}
              value={defaultReferrerBonusDays}
              onChange={(e) =>
                setDefaultReferrerBonusDays(Number(e.target.value) || 0)
              }
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
            />
            <span className="text-xs text-muted-foreground">
              {t("defaultReferrerBonusDaysHint")}
            </span>
          </label>
          <div className="flex items-center gap-3 pt-1">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="w-full sm:w-auto"
            >
              {saving ? tc("saving") : tc("save")}
            </Button>
            {saved && (
              <span className="text-sm text-accent">{t("settingsSaved")}</span>
            )}
          </div>
        </div>
      </Card>

      <Card>
        <CardTitle className="mb-2">{t("accessExpiryCheckTitle")}</CardTitle>
        <p className="mb-4 text-sm text-muted-foreground">
          {t("accessExpiryCheckHint")}
        </p>
        <AdminErrorAlert message={checkError} />
        <div className="flex max-w-sm flex-col gap-4">
          <label className="space-y-1.5">
            <span className="text-sm text-muted-foreground">
              {t("accessExpiryCheckInterval")}
            </span>
            <select
              value={accessExpiryInterval}
              onChange={(e) =>
                setAccessExpiryInterval(
                  e.target.value as AccessExpiryCheckIntervalValue,
                )
              }
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
            >
              {ACCESS_EXPIRY_CHECK_INTERVALS.map((interval) => (
                <option key={interval} value={interval}>
                  {t(`accessExpiryCheckInterval_${interval}`)}
                </option>
              ))}
            </select>
            <span className="text-xs text-muted-foreground">
              {t("accessExpiryCheckIntervalHint")}
            </span>
          </label>
          <p className="text-sm text-muted-foreground">
            {t("accessExpiryCheckLastRun", {
              date: formatLastRun(accessExpiryLastRunAt),
            })}
          </p>
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={handleRunAccessExpiryCheck}
              disabled={checkRunning}
            >
              {checkRunning
                ? t("accessExpiryCheckRunning")
                : t("accessExpiryCheckRun")}
            </Button>
            <Button
              type="button"
              onClick={handleSave}
              disabled={saving}
              variant="outline"
            >
              {saving ? tc("saving") : t("accessExpiryCheckSaveSchedule")}
            </Button>
          </div>
          {checkMessage && (
            <p className="text-sm text-accent">{checkMessage}</p>
          )}
          <p className="text-xs text-muted-foreground">
            {t("accessExpiryCheckCronHint")}
          </p>
        </div>
      </Card>
    </div>
  );
}
