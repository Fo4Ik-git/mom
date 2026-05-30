"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { AdminErrorAlert } from "@/app/components/admin/admin-error-alert";
import { Button } from "@/app/components/ui/button";
import { Card, CardTitle } from "@/app/components/ui/card";
import { appFetch } from "@/lib/api/api-client";
import { adminApiErrorMessage } from "@/lib/admin/admin-api-error";
import { signupAbsoluteUrl } from "@/lib/auth/signup-url";

interface AccessKeyRow {
  id: string;
  code: string;
  kind: "REGISTRATION" | "REFERRAL";
  label: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  accessDays: number | null;
  active: boolean;
  referrerEmail: string | null;
  createdAt: string;
}

export function AdminAccessKeys() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [keys, setKeys] = useState<AccessKeyRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const [form, setForm] = useState({
    label: "",
    maxUses: "",
    expiresAt: "",
    accessDays: "",
    kind: "REGISTRATION" as "REGISTRATION" | "REFERRAL",
  });

  const load = useCallback(async () => {
    setLoadError(null);
    const res = await appFetch("/api/admin/access-keys");
    const data = await res.json();
    if (!res.ok) {
      setLoadError(adminApiErrorMessage(data, t));
      setKeys([]);
      return;
    }
    setKeys(data.keys ?? []);
  }, [t]);

  useEffect(() => {
    load();
  }, [load]);

  async function createKey(event: React.FormEvent) {
    event.preventDefault();
    setCreating(true);
    const res = await appFetch("/api/admin/access-keys", {
      method: "POST",
      body: JSON.stringify({
        label: form.label || undefined,
        kind: form.kind,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt
          ? new Date(`${form.expiresAt}T23:59:59`).toISOString()
          : null,
        accessDays: form.accessDays ? Number(form.accessDays) : null,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json();
      setLoadError(adminApiErrorMessage(data, t));
      return;
    }
    setForm({ label: "", maxUses: "", expiresAt: "", accessDays: "", kind: "REGISTRATION" });
    await load();
  }

  async function toggleActive(key: AccessKeyRow) {
    await appFetch(`/api/admin/access-keys/${key.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !key.active }),
    });
    await load();
  }

  async function removeKey(id: string) {
    if (!confirm(t("accessKeyDeleteConfirm"))) {
      return;
    }
    await appFetch(`/api/admin/access-keys/${id}`, { method: "DELETE" });
    await load();
  }

  async function copyLink(key: AccessKeyRow) {
    const url = signupAbsoluteUrl(key.code, window.location.origin);
    await navigator.clipboard.writeText(url);
    setCopiedId(key.id);
    setTimeout(() => setCopiedId(null), 2000);
  }

  function usesLabel(key: AccessKeyRow) {
    if (key.maxUses == null) {
      return `${key.usedCount} / ∞`;
    }
    return `${key.usedCount} / ${key.maxUses}`;
  }

  return (
    <div className="space-y-6">
      <AdminErrorAlert message={loadError} />

      <Card>
        <CardTitle className="mb-4">{t("accessKeyCreate")}</CardTitle>
        <form onSubmit={createKey} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-muted-foreground">{t("accessKeyLabel")}</span>
            <input
              value={form.label}
              onChange={(e) => setForm((f) => ({ ...f, label: e.target.value }))}
              placeholder={t("accessKeyLabelPlaceholder")}
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">{t("accessKeyKind")}</span>
            <select
              value={form.kind}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  kind: e.target.value as "REGISTRATION" | "REFERRAL",
                }))
              }
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
            >
              <option value="REGISTRATION">{t("accessKeyKindRegistration")}</option>
              <option value="REFERRAL">{t("accessKeyKindReferral")}</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">{t("accessKeyMaxUses")}</span>
            <input
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
              placeholder="∞"
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">{t("accessKeyExpires")}</span>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">{t("accessKeyAccessDays")}</span>
            <input
              type="number"
              min={0}
              value={form.accessDays}
              onChange={(e) => setForm((f) => ({ ...f, accessDays: e.target.value }))}
              placeholder={t("accessKeyAccessDaysDefault")}
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
            />
          </label>
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={creating}>
              {creating ? t("accessKeyCreating") : t("accessKeyCreateBtn")}
            </Button>
          </div>
        </form>
      </Card>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card/90 shadow-card">
        <table className="w-full min-w-[800px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-3 font-medium">{t("accessKeyCode")}</th>
              <th className="px-4 py-3 font-medium">{t("accessKeyLabel")}</th>
              <th className="px-4 py-3 font-medium">{t("accessKeyUses")}</th>
              <th className="px-4 py-3 font-medium">{t("accessKeyKind")}</th>
              <th className="px-4 py-3 font-medium">{t("status")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {keys.map((key) => (
              <tr key={key.id} className="border-b border-border/60">
                <td className="px-4 py-3 font-mono text-xs font-semibold tracking-wide">
                  {key.code}
                </td>
                <td className="px-4 py-3 text-muted-foreground">
                  {key.label ?? "—"}
                  {key.referrerEmail && (
                    <span className="mt-0.5 block text-[11px]">
                      {t("accessKeyReferrer")}: {key.referrerEmail}
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 tabular-nums">{usesLabel(key)}</td>
                <td className="px-4 py-3 text-xs">
                  {key.kind === "REFERRAL"
                    ? t("accessKeyKindReferral")
                    : t("accessKeyKindRegistration")}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      key.active
                        ? "bg-green-500/15 text-green-700 dark:text-green-400"
                        : "bg-muted text-muted-foreground"
                    }`}
                  >
                    {key.active ? t("accessKeyActive") : t("accessKeyInactive")}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex flex-wrap justify-end gap-2">
                    <button
                      type="button"
                      onClick={() => copyLink(key)}
                      className="text-xs font-medium text-accent underline"
                    >
                      {copiedId === key.id ? t("accessKeyCopied") : t("accessKeyCopyLink")}
                    </button>
                    <button
                      type="button"
                      onClick={() => toggleActive(key)}
                      className="text-xs text-muted-foreground underline"
                    >
                      {key.active ? t("accessKeyDeactivate") : t("accessKeyActivate")}
                    </button>
                    <button
                      type="button"
                      onClick={() => removeKey(key.id)}
                      className="text-xs font-medium text-destructive underline"
                    >
                      {tc("delete")}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {keys.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground">
                  {t("accessKeyEmpty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
