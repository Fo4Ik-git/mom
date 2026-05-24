"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
import { Card, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { AdminErrorAlert } from "@/app/components/admin/admin-error-alert";
import { appFetch } from "@/lib/api-client";
import { adminApiErrorMessage } from "@/lib/admin-api-error";

export function AdminPlatformSettings() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [defaultMax, setDefaultMax] = useState(5);
  const [defaultAccessDays, setDefaultAccessDays] = useState(30);
  const [supportEmail, setSupportEmail] = useState("");
  const [supportTelegram, setSupportTelegram] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);

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
        setSupportEmail(data.supportEmail ?? "");
        setSupportTelegram(data.supportTelegram ?? "");
      })
      .finally(() => setLoading(false));
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
        supportEmail: supportEmail.trim() || null,
        supportTelegram: supportTelegram.trim() || null,
      }),
    });
    const data = await response.json();
    setSaving(false);
    if (response.ok) {
      setSaved(true);
      return;
    }
    setSaveError(adminApiErrorMessage(data, t));
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{tc("loading")}</p>;
  }

  return (
    <Card>
      <AdminErrorAlert message={loadError ?? saveError} />
      <CardTitle className="mb-2">{t("platformSettings")}</CardTitle>
      <p className="mb-4 text-sm text-muted-foreground">
        {t("platformSettingsHint")}
      </p>
      <div className="mb-6 space-y-4 border-b border-border/60 pb-6">
        <p className="text-sm font-semibold">{t("supportContactTitle")}</p>
        <p className="text-sm text-muted-foreground">{t("supportContactHint")}</p>
        <div className="flex max-w-sm flex-col gap-4">
          <label className="space-y-1.5">
            <span className="text-sm text-muted-foreground">{t("supportEmail")}</span>
            <input
              type="email"
              value={supportEmail}
              onChange={(e) => setSupportEmail(e.target.value)}
              placeholder="support@example.com"
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
            />
          </label>
          <label className="space-y-1.5">
            <span className="text-sm text-muted-foreground">{t("supportTelegram")}</span>
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
            onChange={(e) => setDefaultAccessDays(Number(e.target.value) || 0)}
            className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
          />
          <span className="text-xs text-muted-foreground">
            {t("defaultAccessDaysHint")}
          </span>
        </label>
        <div className="flex items-center gap-3 pt-1">
          <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
            {saving ? tc("saving") : tc("save")}
          </Button>
          {saved && (
            <span className="text-sm text-accent">{t("settingsSaved")}</span>
          )}
        </div>
      </div>
    </Card>
  );
}
