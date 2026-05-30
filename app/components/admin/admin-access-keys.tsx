"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useMemo, useState, type ReactNode } from "react";
import { AdminErrorAlert } from "@/app/components/admin/admin-error-alert";
import { Button } from "@/app/components/ui/button";
import { Card, CardTitle } from "@/app/components/ui/card";
import { DataTable } from "@/app/components/ui/data-table";
import type { DataTableColumn } from "@/app/components/ui/data-table";
import { appFetch } from "@/lib/api/api-client";
import { adminApiErrorMessage } from "@/lib/admin/admin-api-error";
import {
  accessExpiresAtFromDateInput,
  formatAccessDateShort,
  formatDateInputLocal,
} from "@/lib/access/access-dates";
import { usePaginatedTable } from "@/lib/hooks/use-paginated-table";
import {
  buildTablePagination,
  tableQueryParams,
} from "@/lib/ui/table-pagination";
import { AdminUserSelect } from "@/app/components/admin/admin-user-select";
import { signupAbsoluteUrl } from "@/lib/auth/signup-url";

const tableActionClass = "h-8 px-3 text-xs";

export interface AccessKeyRow {
  id: string;
  code: string;
  kind: "REGISTRATION" | "REFERRAL";
  label: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  accessDays: number | null;
  referrerBonusDays: number | null;
  active: boolean;
  referrerEmail: string | null;
  createdAt: string;
}

type AccessKeyEdit = {
  label: string;
  active: boolean;
  maxUses: string;
  expiresAt: string;
  accessDays: string;
  referrerBonusDays: string;
};

function extendDateInput(dateInput: string, months: number): string {
  const base = dateInput
    ? new Date(`${dateInput}T12:00:00`)
    : new Date();
  if (base.getTime() < Date.now()) {
    base.setTime(Date.now());
  }
  base.setMonth(base.getMonth() + months);
  return formatDateInputLocal(base.toISOString());
}

function StatusBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "neutral";
}) {
  const tones = {
    success: "bg-green-500/15 text-green-700 dark:text-green-400",
    neutral: "bg-muted text-muted-foreground",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function AccessKeyManagePanel({
  keyRow,
  edit,
  saving,
  t,
  tc,
  onEditChange,
  onExtendExpiry,
  onSave,
  onResetUses,
}: {
  keyRow: AccessKeyRow;
  edit: AccessKeyEdit;
  saving: boolean;
  t: ReturnType<typeof useTranslations<"admin">>;
  tc: ReturnType<typeof useTranslations<"common">>;
  onEditChange: (patch: Partial<AccessKeyEdit>) => void;
  onExtendExpiry: (months: number) => void;
  onSave: () => void;
  onResetUses: () => void;
}) {
  const inputClass =
    "block h-11 w-full rounded-xl border border-border bg-input px-3 text-base sm:max-w-xs sm:text-sm";

  return (
    <div className="border-t border-border/60 bg-muted/25 px-4 py-5">
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant={edit.active ? "outline" : "primary"}
          className="h-10 text-sm"
          onClick={() => onEditChange({ active: !edit.active })}
        >
          {edit.active ? t("accessKeyDeactivate") : t("accessKeyActivate")}
        </Button>
        <StatusBadge tone={edit.active ? "success" : "neutral"}>
          {edit.active ? t("accessKeyActive") : t("accessKeyInactive")}
        </StatusBadge>
      </div>

      <div className="grid max-w-3xl gap-4 sm:grid-cols-2">
        {keyRow.referrerEmail && (
          <p className="text-sm text-muted-foreground sm:col-span-2">
            {t("accessKeyReferrer")}:{" "}
            <span className="font-medium text-foreground">
              {keyRow.referrerEmail}
            </span>
          </p>
        )}
        <label className="block space-y-1 sm:col-span-2">
          <span className="text-sm text-muted-foreground">{t("accessKeyLabel")}</span>
          <input
            value={edit.label}
            onChange={(e) => onEditChange({ label: e.target.value })}
            placeholder={t("accessKeyLabelPlaceholder")}
            className={inputClass}
          />
        </label>

        <div className="space-y-3 sm:col-span-2">
          <p className="text-sm font-semibold">{t("accessKeyExpires")}</p>
          <label className="block space-y-1">
            <span className="text-sm text-muted-foreground">
              {t("accessKeyValidUntil")}
            </span>
            <input
              type="date"
              value={edit.expiresAt}
              onChange={(e) => onEditChange({ expiresAt: e.target.value })}
              className={inputClass}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 text-xs sm:text-sm"
              onClick={() => onExtendExpiry(1)}
            >
              {t("extend1Month")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 text-xs sm:text-sm"
              onClick={() => onExtendExpiry(12)}
            >
              {t("extend1Year")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 text-xs sm:text-sm"
              onClick={() => onEditChange({ expiresAt: "" })}
            >
              {t("accessKeyExpiresUnlimited")}
            </Button>
          </div>
        </div>

        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">{t("accessKeyMaxUses")}</span>
          <input
            type="number"
            min={1}
            value={edit.maxUses}
            onChange={(e) => onEditChange({ maxUses: e.target.value })}
            placeholder="∞"
            className={inputClass}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-2 h-9 text-xs"
            onClick={() => onEditChange({ maxUses: "" })}
          >
            {t("accessKeyMaxUsesUnlimited")}
          </Button>
        </label>

        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">{t("accessKeyUsedCount")}</p>
          <p className="text-lg font-semibold tabular-nums">
            {keyRow.usedCount}
            {edit.maxUses !== "" && ` / ${edit.maxUses}`}
            {edit.maxUses === "" && " / ∞"}
          </p>
          <Button
            type="button"
            variant="outline"
            className="h-9 text-xs"
            disabled={keyRow.usedCount === 0}
            onClick={onResetUses}
          >
            {t("accessKeyResetUses")}
          </Button>
        </div>

        <label className="block space-y-1 sm:col-span-2">
          <span className="text-sm text-muted-foreground">{t("accessKeyAccessDays")}</span>
          <input
            type="number"
            min={0}
            value={edit.accessDays}
            onChange={(e) => onEditChange({ accessDays: e.target.value })}
            placeholder={t("accessKeyAccessDaysDefault")}
            className={inputClass}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-2 h-9 text-xs"
            onClick={() => onEditChange({ accessDays: "" })}
          >
            {t("accessKeyAccessDaysDefault")}
          </Button>
        </label>

        <label className="block space-y-1 sm:col-span-2">
          <span className="text-sm text-muted-foreground">
            {t("accessKeyReferrerBonusDays")}
          </span>
          <input
            type="number"
            min={0}
            value={edit.referrerBonusDays}
            onChange={(e) =>
              onEditChange({ referrerBonusDays: e.target.value })
            }
            placeholder={t("accessKeyReferrerBonusDaysDefault")}
            className={inputClass}
          />
          <Button
            type="button"
            variant="outline"
            className="mt-2 h-9 text-xs"
            onClick={() => onEditChange({ referrerBonusDays: "" })}
          >
            {t("accessKeyReferrerBonusDaysDefault")}
          </Button>
          <p className="text-xs text-muted-foreground">
            {t("accessKeyReferrerBonusDaysHint")}
          </p>
        </label>

        <div className="sm:col-span-2">
          <Button
            type="button"
            className="h-11 w-full text-sm sm:w-auto"
            disabled={saving}
            onClick={onSave}
          >
            {saving ? tc("loading") : tc("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

function editFromKey(key: AccessKeyRow): AccessKeyEdit {
  return {
    label: key.label ?? "",
    active: key.active,
    maxUses: key.maxUses != null ? String(key.maxUses) : "",
    expiresAt: formatDateInputLocal(key.expiresAt),
    accessDays: key.accessDays != null ? String(key.accessDays) : "",
    referrerBonusDays:
      key.referrerBonusDays != null ? String(key.referrerBonusDays) : "",
  };
}

export function AdminAccessKeys() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [loadError, setLoadError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [edits, setEdits] = useState<Record<string, AccessKeyEdit>>({});

  const [form, setForm] = useState({
    label: "",
    code: "",
    referrerUserId: "",
    maxUses: "",
    expiresAt: "",
    accessDays: "",
    referrerBonusDays: "",
  });

  const fetchPage = useCallback(
    async ({
      page,
      pageSize,
      query,
    }: {
      page: number;
      pageSize: number;
      query: string;
    }) => {
      const res = await appFetch(
        `/api/admin/access-keys?${tableQueryParams(page, pageSize, query)}`,
      );
      const data = await res.json();

      if (!res.ok) {
        setLoadError(adminApiErrorMessage(data, t));
        return {
          rows: [] as AccessKeyRow[],
          pagination: buildTablePagination(page, pageSize, 0),
        };
      }

      setLoadError(null);
      const loadedKeys: AccessKeyRow[] = data.keys ?? [];

      setEdits((current) => {
        const next = { ...current };
        for (const key of loadedKeys) {
          next[key.id] = editFromKey(key);
        }
        return next;
      });

      setExpandedId((current) =>
        current && loadedKeys.some((k) => k.id === current) ? current : null,
      );

      return {
        rows: loadedKeys,
        pagination:
          data.pagination ?? buildTablePagination(page, pageSize, 0),
      };
    },
    [t],
  );

  const {
    rows: keys,
    loading,
    pagination,
    setPage,
    pageSize,
    setPageSize,
    searchInput,
    setSearchInput,
    refresh,
  } = usePaginatedTable<AccessKeyRow>({ fetchPage });

  const tableLabels = useMemo(
    () => ({
      loading: tc("loading"),
      noResults: t("referralsEmpty"),
      refresh: t("refresh"),
      formatShowing: (from: number, to: number, total: number) =>
        t("usersShowing", { from, to, total }),
      formatPage: (pageNum: number, pages: number) =>
        t("usersPage", { page: pageNum, pages }),
      pageSize: t("usersPageSize"),
      prev: t("usersPrev"),
      next: t("usersNext"),
    }),
    [t, tc],
  );

  function setEdit(keyId: string, patch: Partial<AccessKeyEdit>) {
    setEdits((current) => ({
      ...current,
      [keyId]: { ...current[keyId], ...patch },
    }));
  }

  async function patchKey(id: string, body: Record<string, unknown>) {
    const res = await appFetch(`/api/admin/access-keys/${id}`, {
      method: "PATCH",
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const data = await res.json();
      setLoadError(adminApiErrorMessage(data, t));
      return false;
    }
    setLoadError(null);
    await refresh();
    return true;
  }

  async function saveKey(key: AccessKeyRow) {
    const edit = edits[key.id];
    if (!edit) {
      return;
    }

    if (edit.maxUses !== "" && Number(edit.maxUses) < key.usedCount) {
      setLoadError(t("accessKeyMaxUsesBelowUsed"));
      return;
    }

    setSavingId(key.id);
    const ok = await patchKey(key.id, {
      label: edit.label.trim() || null,
      active: edit.active,
      maxUses: edit.maxUses === "" ? null : Number(edit.maxUses),
      expiresAt: edit.expiresAt
        ? accessExpiresAtFromDateInput(edit.expiresAt)
        : null,
      accessDays:
        edit.accessDays === "" ? null : Number(edit.accessDays),
      referrerBonusDays:
        edit.referrerBonusDays === ""
          ? null
          : Number(edit.referrerBonusDays),
    });
    setSavingId(null);
    if (ok) {
      setExpandedId((current) => (current === key.id ? key.id : current));
    }
  }

  async function resetUses(key: AccessKeyRow) {
    if (!confirm(t("accessKeyResetUsesConfirm"))) {
      return;
    }
    setSavingId(key.id);
    await patchKey(key.id, { usedCount: 0 });
    setSavingId(null);
  }

  async function createKey(event: React.FormEvent) {
    event.preventDefault();

    if (!form.referrerUserId) {
      setLoadError(t("accessKeyReferrerRequired"));
      return;
    }

    const codeTrimmed = form.code.trim();
    if (codeTrimmed.length > 0 && codeTrimmed.length < 4) {
      setLoadError(t("userReferralCodeTooShort"));
      return;
    }

    setCreating(true);
    const res = await appFetch("/api/admin/access-keys", {
      method: "POST",
      body: JSON.stringify({
        label: form.label || undefined,
        code: codeTrimmed || undefined,
        referrerUserId: form.referrerUserId,
        maxUses: form.maxUses ? Number(form.maxUses) : null,
        expiresAt: form.expiresAt
          ? new Date(`${form.expiresAt}T23:59:59`).toISOString()
          : null,
        accessDays: form.accessDays ? Number(form.accessDays) : null,
        referrerBonusDays: form.referrerBonusDays
          ? Number(form.referrerBonusDays)
          : null,
      }),
    });
    setCreating(false);
    if (!res.ok) {
      const data = await res.json();
      const message =
        data.error === "referral_user_required"
          ? t("accessKeyReferrerRequired")
          : data.error === "code_exists"
            ? t("userReferralCodeExists")
            : data.error === "invalid_code"
              ? t("userReferralCodeTooShort")
              : adminApiErrorMessage(data, t);
      setLoadError(message);
      return;
    }
    setForm({
      label: "",
      code: "",
      referrerUserId: "",
      maxUses: "",
      expiresAt: "",
      accessDays: "",
      referrerBonusDays: "",
    });
    await refresh();
  }

  async function removeKey(id: string) {
    if (!confirm(t("accessKeyDeleteConfirm"))) {
      return;
    }
    await appFetch(`/api/admin/access-keys/${id}`, { method: "DELETE" });
    if (expandedId === id) {
      setExpandedId(null);
    }
    await refresh();
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

  function expiresLabel(key: AccessKeyRow) {
    return key.expiresAt
      ? formatAccessDateShort(key.expiresAt, locale)
      : t("accessKeyExpiresUnlimited");
  }

  function renderManagePanel(key: AccessKeyRow) {
    const edit = edits[key.id];
    if (!edit) {
      return null;
    }
    return (
      <AccessKeyManagePanel
        keyRow={key}
        edit={edit}
        saving={savingId === key.id}
        t={t}
        tc={tc}
        onEditChange={(patch) => setEdit(key.id, patch)}
        onExtendExpiry={(months) =>
          setEdit(key.id, {
            expiresAt: extendDateInput(edit.expiresAt, months),
          })
        }
        onSave={() => saveKey(key)}
        onResetUses={() => resetUses(key)}
      />
    );
  }

  const columns = useMemo((): DataTableColumn<AccessKeyRow>[] => {
    return [
      {
        id: "code",
        header: t("accessKeyCode"),
        cellClassName: "font-mono text-xs font-semibold tracking-wide",
        cell: (key) => key.code,
      },
      {
        id: "label",
        header: t("accessKeyLabel"),
        cellClassName: "text-muted-foreground",
        cell: (key) => (
          <>
            {key.label ?? "—"}
            {key.referrerEmail && (
              <span className="mt-0.5 block text-[11px]">
                {t("accessKeyReferrer")}: {key.referrerEmail}
              </span>
            )}
          </>
        ),
      },
      {
        id: "uses",
        header: t("accessKeyUses"),
        cellClassName: "tabular-nums",
        cell: (key) => usesLabel(key),
      },
      {
        id: "expires",
        header: t("accessKeyExpires"),
        cellClassName: "text-xs text-muted-foreground",
        cell: (key) => expiresLabel(key),
      },
      {
        id: "status",
        header: t("status"),
        cell: (key) => (
          <StatusBadge tone={key.active ? "success" : "neutral"}>
            {key.active ? t("accessKeyActive") : t("accessKeyInactive")}
          </StatusBadge>
        ),
      },
      {
        id: "actions",
        header: t("actions"),
        headerClassName: "text-right",
        cellClassName: "text-right",
        cell: (key) => {
          const isExpanded = expandedId === key.id;
          return (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant={copiedId === key.id ? "primary" : "outline"}
                className={tableActionClass}
                onClick={() => copyLink(key)}
              >
                {copiedId === key.id ? t("accessKeyCopied") : t("accessKeyCopyLink")}
              </Button>
              <Button
                type="button"
                variant={isExpanded ? "primary" : "outline"}
                className={tableActionClass}
                onClick={() => setExpandedId(isExpanded ? null : key.id)}
              >
                {isExpanded ? t("hideDetails") : t("manage")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className={tableActionClass}
                onClick={() => removeKey(key.id)}
              >
                {tc("delete")}
              </Button>
            </div>
          );
        },
      },
    ];
  }, [t, tc, copiedId, expandedId, locale]);

  function renderMobileCard(key: AccessKeyRow) {
    const isExpanded = expandedId === key.id;
    return (
      <article key={key.id} className="bg-card/90">
        <div className="space-y-3 p-4">
          <p className="font-mono text-sm font-semibold tracking-wide">{key.code}</p>
          <p className="text-sm text-muted-foreground">{key.label ?? "—"}</p>
          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={key.active ? "success" : "neutral"}>
              {key.active ? t("accessKeyActive") : t("accessKeyInactive")}
            </StatusBadge>
          </div>
          <dl className="grid grid-cols-2 gap-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t("accessKeyUses")}</dt>
              <dd className="font-medium tabular-nums">{usesLabel(key)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">{t("accessKeyExpires")}</dt>
              <dd className="font-medium">{expiresLabel(key)}</dd>
            </div>
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 text-xs"
              onClick={() => copyLink(key)}
            >
              {copiedId === key.id ? t("accessKeyCopied") : t("accessKeyCopyLink")}
            </Button>
            <Button
              type="button"
              variant={isExpanded ? "primary" : "outline"}
              className="h-10 flex-1 text-xs"
              onClick={() => setExpandedId(isExpanded ? null : key.id)}
            >
              {isExpanded ? t("hideDetails") : t("manage")}
            </Button>
          </div>
        </div>
        {isExpanded && renderManagePanel(key)}
      </article>
    );
  }

  const inputClass =
    "block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm";

  return (
    <div className="space-y-6">
      <AdminErrorAlert message={loadError} />

      <Card>
        <CardTitle className="mb-1">{t("referralsTitle")}</CardTitle>
        <p className="mb-4 text-sm text-muted-foreground">{t("referralsCreateHint")}</p>
        <form onSubmit={createKey} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          <label className="space-y-1 sm:col-span-2 lg:col-span-3">
            <span className="text-sm text-muted-foreground">
              {t("accessKeyReferrerUser")}
            </span>
            <AdminUserSelect
              value={form.referrerUserId}
              onChange={(userId) =>
                setForm((f) => ({ ...f, referrerUserId: userId }))
              }
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-muted-foreground">
              {t("accessKeyCode")}
            </span>
            <input
              value={form.code}
              onChange={(e) =>
                setForm((f) => ({
                  ...f,
                  code: e.target.value.toUpperCase(),
                }))
              }
              placeholder={t("userReferralCodePlaceholder")}
              className={`${inputClass} font-mono tracking-wide`}
              autoComplete="off"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">
              {t("accessKeyLabel")}
            </span>
            <input
              value={form.label}
              onChange={(e) =>
                setForm((f) => ({ ...f, label: e.target.value }))
              }
              placeholder={t("accessKeyLabelPlaceholder")}
              className={inputClass}
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">{t("accessKeyMaxUses")}</span>
            <input
              type="number"
              min={1}
              value={form.maxUses}
              onChange={(e) => setForm((f) => ({ ...f, maxUses: e.target.value }))}
              placeholder="∞"
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">{t("accessKeyExpires")}</span>
            <input
              type="date"
              value={form.expiresAt}
              onChange={(e) => setForm((f) => ({ ...f, expiresAt: e.target.value }))}
              className={inputClass}
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
              className={inputClass}
            />
          </label>
          <label className="space-y-1 sm:col-span-2">
            <span className="text-sm text-muted-foreground">
              {t("accessKeyReferrerBonusDays")}
            </span>
            <input
              type="number"
              min={0}
              value={form.referrerBonusDays}
              onChange={(e) =>
                setForm((f) => ({ ...f, referrerBonusDays: e.target.value }))
              }
              placeholder={t("accessKeyReferrerBonusDaysDefault")}
              className={inputClass}
            />
            <p className="text-xs text-muted-foreground">
              {t("accessKeyReferrerBonusDaysHint")}
            </p>
          </label>
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={creating}>
              {creating ? t("accessKeyCreating") : t("accessKeyCreateReferralBtn")}
            </Button>
          </div>
        </form>
      </Card>

      <DataTable<AccessKeyRow>
        title={t("referralsListTitle")}
        columns={columns}
        rows={keys}
        rowKey={(key) => key.id}
        labels={tableLabels}
        pagination={pagination}
        pageSize={pageSize}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRefresh={() => void refresh()}
        minTableWidth="880px"
        renderMobileCard={renderMobileCard}
        renderRowDetail={(key) =>
          expandedId === key.id ? renderManagePanel(key) : null
        }
        toolbar={
          <label className="block space-y-1">
            <span className="sr-only">{t("accessKeysSearchPlaceholder")}</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("accessKeysSearchPlaceholder")}
              className={inputClass}
              autoComplete="off"
            />
          </label>
        }
      />
    </div>
  );
}
