"use client";

import { CalculatorSharesPanel } from "@/app/components/builder/calculator-shares-panel";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { AdminErrorAlert } from "@/app/components/admin/admin-error-alert";
import { Button } from "@/app/components/ui/button";
import { DataTable } from "@/app/components/ui/data-table";
import type { DataTableColumn } from "@/app/components/ui/data-table";
import { appFetch } from "@/lib/api/api-client";
import { adminApiErrorMessage } from "@/lib/admin/admin-api-error";
import { usePaginatedTable } from "@/lib/hooks/use-paginated-table";
import {
  buildTablePagination,
  tableQueryParams,
} from "@/lib/ui/table-pagination";

interface CalculatorRow {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
  isTemplate: boolean;
  ownerEmail: string | null;
  ownerMissing?: boolean;
}

const tableActionClass = "h-8 px-3 text-xs";

export function AdminCalculators() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [transferEmail, setTransferEmail] = useState<Record<string, string>>({});
  const [transferringId, setTransferringId] = useState<string | null>(null);

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
      const response = await appFetch(
        `/api/admin/calculators?${tableQueryParams(page, pageSize, query)}`,
      );
      const data = await response.json();

      if (!response.ok) {
        setListError(adminApiErrorMessage(data, t));
        return {
          rows: [] as CalculatorRow[],
          pagination: buildTablePagination(page, pageSize, 0),
        };
      }

      setListError(null);
      return {
        rows: (data.calculators ?? []) as CalculatorRow[],
        pagination:
          data.pagination ?? buildTablePagination(page, pageSize, 0),
      };
    },
    [t],
  );

  const [listError, setListError] = useState<string | null>(null);

  const {
    rows: calculators,
    loading,
    pagination,
    setPage,
    pageSize,
    setPageSize,
    searchInput,
    setSearchInput,
    refresh,
  } = usePaginatedTable<CalculatorRow>({ fetchPage });

  const tableLabels = useMemo(
    () => ({
      loading: tc("loading"),
      noResults: t("calculatorsEmpty"),
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

  async function remove(id: string) {
    if (!confirm(t("deleteConfirm"))) {
      return;
    }
    setActionError(null);
    const response = await appFetch(`/api/admin/calculators/${id}`, {
      method: "DELETE",
    });
    if (!response.ok) {
      const data = await response.json();
      setActionError(adminApiErrorMessage(data, t));
      return;
    }
    if (expandedId === id) {
      setExpandedId(null);
    }
    await refresh();
  }

  async function transfer(id: string) {
    const email = transferEmail[id]?.trim();
    if (!email) {
      return;
    }
    if (!confirm(t("transferConfirm", { email }))) {
      return;
    }
    setActionError(null);
    setTransferringId(id);
    const response = await appFetch(`/api/admin/calculators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerEmail: email }),
    });
    const data = await response.json();
    setTransferringId(null);
    if (!response.ok) {
      setActionError(transferErrorMessage(data.error, t));
      return;
    }
    setTransferEmail((current) => ({ ...current, [id]: "" }));
    await refresh();
  }

  const columns = useMemo((): DataTableColumn<CalculatorRow>[] => {
    return [
      {
        id: "name",
        header: t("title"),
        cell: (calculator) => (
          <span className="font-medium">{calculator.name}</span>
        ),
      },
      {
        id: "owner",
        header: t("owner"),
        cell: (calculator) =>
          calculator.ownerMissing ? (
            <span className="italic text-muted-foreground">
              {t("ownerMissing")}
            </span>
          ) : (
            calculator.ownerEmail
          ),
      },
      {
        id: "slug",
        header: t("slug"),
        cellClassName: "font-mono text-xs",
        cell: (calculator) => calculator.slug,
      },
      {
        id: "flags",
        header: t("flags"),
        cellClassName: "text-xs text-muted-foreground",
        cell: (calculator) => (
          <>
            {calculator.isTemplate && `${tc("template")} `}
            {calculator.isPublic && tc("public")}
          </>
        ),
      },
      {
        id: "actions",
        header: t("actions"),
        headerClassName: "text-right",
        cellClassName: "text-right",
        cell: (calculator) => {
          if (calculator.isTemplate) {
            return null;
          }
          const isExpanded = expandedId === calculator.id;
          return (
            <div className="flex flex-wrap justify-end gap-2">
              <Button
                type="button"
                variant="outline"
                className={tableActionClass}
                onClick={() => router.push(`/builder/${calculator.id}`)}
              >
                {t("editCalculator")}
              </Button>
              <Button
                type="button"
                variant={isExpanded ? "primary" : "outline"}
                className={tableActionClass}
                onClick={() =>
                  setExpandedId(isExpanded ? null : calculator.id)
                }
              >
                {isExpanded ? t("manageClose") : t("manage")}
              </Button>
              <Button
                type="button"
                variant="destructive"
                className={tableActionClass}
                onClick={() => remove(calculator.id)}
              >
                {tc("delete")}
              </Button>
            </div>
          );
        },
      },
    ];
  }, [t, tc, expandedId, router]);

  const inputClass =
    "block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm";

  return (
    <div className="space-y-4">
      <AdminErrorAlert message={listError ?? actionError} />

      <DataTable<CalculatorRow>
        title={t("calculators")}
        columns={columns}
        rows={calculators}
        rowKey={(calculator) => calculator.id}
        labels={tableLabels}
        pagination={pagination}
        pageSize={pageSize}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRefresh={() => void refresh()}
        minTableWidth="720px"
        renderRowDetail={(calculator) => {
          if (expandedId !== calculator.id || calculator.isTemplate) {
            return null;
          }
          return (
            <div className="border-b border-border/60 bg-muted/20 px-4 py-4">
              <div className="mx-auto max-w-xl space-y-4">
                <div>
                  <p className="mb-2 text-sm font-medium">{t("transferTitle")}</p>
                  <div className="flex flex-wrap gap-2">
                    <input
                      type="email"
                      value={transferEmail[calculator.id] ?? ""}
                      onChange={(e) =>
                        setTransferEmail((current) => ({
                          ...current,
                          [calculator.id]: e.target.value,
                        }))
                      }
                      placeholder={t("transferEmailPlaceholder")}
                      className="h-10 min-w-[200px] flex-1 rounded-xl border border-border bg-input px-3 text-sm"
                    />
                    <Button
                      type="button"
                      disabled={transferringId === calculator.id}
                      onClick={() => transfer(calculator.id)}
                    >
                      {transferringId === calculator.id
                        ? t("transferring")
                        : t("transferBtn")}
                    </Button>
                  </div>
                </div>
                <CalculatorSharesPanel
                  calculatorId={calculator.id}
                  apiBase="/api/admin/calculators"
                />
              </div>
            </div>
          );
        }}
        toolbar={
          <label className="block space-y-1">
            <span className="sr-only">{t("calculatorsSearchPlaceholder")}</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("calculatorsSearchPlaceholder")}
              className={inputClass}
              autoComplete="off"
            />
          </label>
        }
      />
    </div>
  );
}

function transferErrorMessage(
  code: string | undefined,
  t: (key: string, values?: Record<string, string>) => string,
): string {
  switch (code) {
    case "user_not_found":
      return t("transferUserNotFound");
    case "cannot_transfer_template":
      return t("cannotTransferTemplate");
    default:
      return t("transferFailed");
  }
}
