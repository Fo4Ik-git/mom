"use client";

import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { AdminErrorAlert } from "@/app/components/admin/admin-error-alert";
import { Button } from "@/app/components/ui/button";

const tableActionClass = "h-8 px-3 text-xs";
import { Card, CardTitle } from "@/app/components/ui/card";
import { DataTable } from "@/app/components/ui/data-table";
import type { DataTableColumn } from "@/app/components/ui/data-table";
import { appFetch } from "@/lib/api/api-client";
import { adminApiErrorMessage } from "@/lib/admin/admin-api-error";
import { usePaginatedTable } from "@/lib/hooks/use-paginated-table";
import {
  buildTablePagination,
  tableQueryParams,
} from "@/lib/ui/table-pagination";
import { signupAbsoluteUrl } from "@/lib/auth/signup-url";

export interface AccessKeyRow {
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
      return {
        rows: (data.keys ?? []) as AccessKeyRow[],
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
      noResults: t("accessKeyEmpty"),
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
    setForm({
      label: "",
      maxUses: "",
      expiresAt: "",
      accessDays: "",
      kind: "REGISTRATION",
    });
    await refresh();
  }

  async function toggleActive(key: AccessKeyRow) {
    await appFetch(`/api/admin/access-keys/${key.id}`, {
      method: "PATCH",
      body: JSON.stringify({ active: !key.active }),
    });
    await refresh();
  }

  async function removeKey(id: string) {
    if (!confirm(t("accessKeyDeleteConfirm"))) {
      return;
    }
    await appFetch(`/api/admin/access-keys/${id}`, { method: "DELETE" });
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
        id: "kind",
        header: t("accessKeyKind"),
        cellClassName: "text-xs",
        cell: (key) =>
          key.kind === "REFERRAL"
            ? t("accessKeyKindReferral")
            : t("accessKeyKindRegistration"),
      },
      {
        id: "status",
        header: t("status"),
        cell: (key) => (
          <span
            className={`rounded-full px-2 py-0.5 text-xs font-medium ${
              key.active
                ? "bg-green-500/15 text-green-700 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {key.active ? t("accessKeyActive") : t("accessKeyInactive")}
          </span>
        ),
      },
      {
        id: "actions",
        header: t("actions"),
        headerClassName: "text-right",
        cellClassName: "text-right",
        cell: (key) => (
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
              variant="outline"
              className={tableActionClass}
              onClick={() => toggleActive(key)}
            >
              {key.active ? t("accessKeyDeactivate") : t("accessKeyActivate")}
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
        ),
      },
    ];
  }, [t, tc, copiedId]);

  const inputClass =
    "block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm";

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
              className={inputClass}
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
              className={inputClass}
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
          <div className="flex items-end sm:col-span-2 lg:col-span-3">
            <Button type="submit" disabled={creating}>
              {creating ? t("accessKeyCreating") : t("accessKeyCreateBtn")}
            </Button>
          </div>
        </form>
      </Card>

      <DataTable<AccessKeyRow>
        title={t("accessKeys")}
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
