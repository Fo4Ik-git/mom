"use client";

import { CalculatorSharesPanel } from "@/app/components/builder/calculator-shares-panel";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useState } from "react";
import { useRouter } from "@/i18n/navigation";
import {
  AdminUserSelect,
  type UserOption,
} from "@/app/components/admin/admin-user-select";
import { AdminConfirmDialog } from "@/app/components/admin/admin-confirm-dialog";
import { AdminErrorAlert } from "@/app/components/admin/admin-error-alert";
import {
  AdminManageModal,
  type AdminManageSection,
} from "@/app/components/admin/admin-manage-modal";
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
  const ts = useTranslations("sharing");
  const tc = useTranslations("common");
  const router = useRouter();
  const [actionError, setActionError] = useState<string | null>(null);
  const [manageId, setManageId] = useState<string | null>(null);
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
  const [transferConfirmOpen, setTransferConfirmOpen] = useState(false);
  const [transferUserId, setTransferUserId] = useState("");
  const [transferUserEmail, setTransferUserEmail] = useState("");
  const [transferring, setTransferring] = useState(false);
  const [deleting, setDeleting] = useState(false);

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

  const manageCalculator = useMemo(
    () => calculators.find((row) => row.id === manageId) ?? null,
    [calculators, manageId],
  );

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

  function openManage(calculator: CalculatorRow) {
    setTransferUserId("");
    setTransferUserEmail("");
    setManageId(calculator.id);
  }

  function closeManage() {
    setManageId(null);
    setDeleteConfirmOpen(false);
    setTransferConfirmOpen(false);
  }

  async function remove(id: string) {
    setActionError(null);
    setDeleting(true);
    const response = await appFetch(`/api/admin/calculators/${id}`, {
      method: "DELETE",
    });
    setDeleting(false);
    if (!response.ok) {
      const data = await response.json();
      setActionError(adminApiErrorMessage(data, t));
      return;
    }
    closeManage();
    await refresh();
  }

  async function transfer(id: string) {
    const email = transferUserEmail.trim();
    if (!email) {
      return;
    }
    setActionError(null);
    setTransferring(true);
    const response = await appFetch(`/api/admin/calculators/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ownerEmail: email }),
    });
    const data = await response.json();
    setTransferring(false);
    setTransferConfirmOpen(false);
    if (!response.ok) {
      setActionError(transferErrorMessage(data.error, t));
      return;
    }
    setTransferUserId("");
    setTransferUserEmail("");
    await refresh();
  }

  const manageSections = useMemo((): AdminManageSection[] => {
    if (!manageCalculator) {
      return [];
    }
    return [
      {
        id: "transfer",
        label: t("manageSectionTransfer"),
        content: (
          <div className="max-w-lg space-y-3">
            <p className="text-sm text-muted-foreground">{t("transferTitle")}</p>
            <label className="block space-y-1">
              <span className="text-sm text-muted-foreground">{ts("pickUser")}</span>
              <AdminUserSelect
                key={manageCalculator.id}
                value={transferUserId}
                onChange={(userId, user) => {
                  setTransferUserId(userId);
                  setTransferUserEmail(user?.email ?? "");
                }}
                disabled={transferring}
                placeholder={ts("pickUserPlaceholder")}
                emptyLabel={ts("pickUserEmpty")}
              />
            </label>
            <Button
              type="button"
              disabled={transferring || !transferUserId}
              onClick={() => setTransferConfirmOpen(true)}
            >
              {transferring ? t("transferring") : t("transferBtn")}
            </Button>
          </div>
        ),
      },
      {
        id: "sharing",
        label: t("manageSectionSharing"),
        content: (
          <CalculatorSharesPanel
            calculatorId={manageCalculator.id}
            apiBase="/api/admin/calculators"
          />
        ),
      },
      {
        id: "danger",
        label: t("manageSectionDanger"),
        content: (
          <div className="max-w-lg space-y-3">
            <p className="text-sm text-muted-foreground">{t("deleteConfirm")}</p>
            <Button
              type="button"
              variant="destructive"
              onClick={() => setDeleteConfirmOpen(true)}
            >
              {t("manageDeleteCalculator")}
            </Button>
          </div>
        ),
      },
    ];
  }, [
    manageCalculator,
    t,
    ts,
    transferUserId,
    transferring,
    transferUserEmail,
  ]);

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
                variant="outline"
                className={tableActionClass}
                onClick={() => openManage(calculator)}
              >
                {t("manage")}
              </Button>
            </div>
          );
        },
      },
    ];
  }, [t, tc, router]);

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

      {manageCalculator && (
        <>
          <AdminManageModal
            open={manageId !== null}
            onClose={closeManage}
            title={manageCalculator.name}
            subtitle={
              <span className="font-mono text-xs">{manageCalculator.slug}</span>
            }
            sections={manageSections}
          />
          <AdminConfirmDialog
            open={deleteConfirmOpen}
            title={t("manageDeleteCalculator")}
            message={t("deleteConfirm")}
            confirmLabel={tc("delete")}
            loading={deleting}
            onCancel={() => setDeleteConfirmOpen(false)}
            onConfirm={() => remove(manageCalculator.id)}
          />
          <AdminConfirmDialog
            open={transferConfirmOpen}
            title={t("transferTitle")}
            message={t("transferConfirm", { email: transferUserEmail })}
            confirmLabel={t("transferBtn")}
            variant="primary"
            loading={transferring}
            onCancel={() => setTransferConfirmOpen(false)}
            onConfirm={() => transfer(manageCalculator.id)}
          />
        </>
      )}
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
