"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useState, type ReactNode } from "react";
import { DataTable } from "@/app/components/ui/data-table";
import type { DataTableColumn } from "@/app/components/ui/data-table";
import { usePaginatedTable } from "@/lib/hooks/use-paginated-table";
import {
  buildTablePagination,
  tableQueryParams,
} from "@/lib/ui/table-pagination";
import { Button } from "@/app/components/ui/button";
import { Card, CardTitle } from "@/app/components/ui/card";
import { PasswordInput } from "@/app/components/ui/password-input";
import { AdminErrorAlert } from "@/app/components/admin/admin-error-alert";
import {
  AdminUserManageModal,
  type UserEdit,
} from "@/app/components/admin/admin-user-manage-modal";
import { appFetch } from "@/lib/api/api-client";
import { adminApiErrorMessage } from "@/lib/admin/admin-api-error";
import {
  accessExpiresAtFromDateInput,
  formatAccessDateShort,
  formatDateInputLocal,
} from "@/lib/access/access-dates";

interface UserRow {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  banned: boolean;
  banReason: "ACCESS_EXPIRED" | null;
  maxCalculators: number | null;
  effectiveMaxCalculators: number | null;
  accessExpiresAt: string | null;
  accessActive: boolean;
  adminNotes: string | null;
  calculatorsCount: number;
  usesDefaultLimit: boolean;
  createdAt: string;
}

function addMonths(base: Date, months: number): string {
  const next = new Date(base);
  next.setMonth(next.getMonth() + months);
  return next.toISOString();
}

function StatusBadge({
  children,
  tone,
}: {
  children: ReactNode;
  tone: "success" | "danger" | "warning" | "neutral" | "accent";
}) {
  const tones = {
    success: "bg-green-500/15 text-green-700 dark:text-green-400",
    danger: "bg-destructive/15 text-destructive",
    warning: "bg-amber-500/15 text-amber-800 dark:text-amber-300",
    neutral: "bg-muted text-muted-foreground",
    accent: "bg-accent/15 text-accent",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

function UserStatusSection({
  user,
  t,
  tc,
}: {
  user: UserRow;
  t: ReturnType<typeof useTranslations<"admin">>;
  tc: ReturnType<typeof useTranslations<"common">>;
}) {
  if (user.banned) {
    return (
      <div className="space-y-1">
        <StatusBadge tone="danger">{tc("banned")}</StatusBadge>
        {user.banReason && (
          <p className="text-[11px] text-muted-foreground">
            {t(`banReason_${user.banReason}`)}
          </p>
        )}
      </div>
    );
  }
  if (user.accessActive) {
    return <StatusBadge tone="success">{tc("active")}</StatusBadge>;
  }
  return (
    <StatusBadge tone="warning">{t("accessExpired")}</StatusBadge>
  );
}

export function AdminUsers() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const locale = useLocale();
  const [defaultMax, setDefaultMax] = useState(5);
  const [manageUserId, setManageUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [pendingBanId, setPendingBanId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState<"ACCESS_EXPIRED">("ACCESS_EXPIRED");

  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    role: "USER" as "USER" | "ADMIN",
    maxCalculators: "",
    accessExpiresAt: "",
  });

  const [edits, setEdits] = useState<Record<string, UserEdit>>({});
  const [passwordSavingId, setPasswordSavingId] = useState<string | null>(null);
  const [passwordSuccessId, setPasswordSuccessId] = useState<string | null>(null);
  const [emailSavingId, setEmailSavingId] = useState<string | null>(null);
  const [emailSuccessId, setEmailSuccessId] = useState<string | null>(null);
  const [emailErrors, setEmailErrors] = useState<Record<string, string | null>>({});

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
        `/api/admin/users?${tableQueryParams(page, pageSize, query)}`,
      );
      const data = await response.json();

      if (!response.ok) {
        setLoadError(adminApiErrorMessage(data, t));
        return {
          rows: [] as UserRow[],
          pagination: buildTablePagination(page, pageSize, 0),
        };
      }

      setLoadError(null);
      const loadedUsers: UserRow[] = data.users ?? [];

      if (typeof data.defaultMaxCalculators === "number") {
        setDefaultMax(data.defaultMaxCalculators);
      }

      setEdits((current) => {
        const next = { ...current };
        for (const user of loadedUsers) {
          next[user.id] = {
            maxCalculators:
              user.maxCalculators != null ? String(user.maxCalculators) : "",
            accessExpiresAt: formatDateInputLocal(user.accessExpiresAt),
            adminNotes: user.adminNotes ?? "",
            useDefaultLimit: user.usesDefaultLimit,
            newPassword: "",
            newEmail: user.email,
          };
        }
        return next;
      });

      setManageUserId((current) =>
        current && loadedUsers.some((u) => u.id === current) ? current : null,
      );

      return {
        rows: loadedUsers,
        pagination:
          data.pagination ?? buildTablePagination(page, pageSize, 0),
      };
    },
    [t],
  );

  const {
    rows: users,
    loading,
    pagination,
    setPage,
    pageSize,
    setPageSize,
    searchInput,
    setSearchInput,
    refresh,
  } = usePaginatedTable<UserRow>({ fetchPage });

  async function updateUser(id: string, patch: Record<string, unknown>) {
    const response = await appFetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      body: JSON.stringify(patch),
    });
    if (!response.ok) {
      const data = await response.json();
      setLoadError(adminApiErrorMessage(data, t));
      return;
    }
    await refresh();
  }

  async function saveUserPassword(user: UserRow) {
    const edit = edits[user.id];
    if (!edit || edit.newPassword.length < 8) {
      return;
    }

    setPasswordSavingId(user.id);
    setPasswordSuccessId(null);
    setLoadError(null);

    const response = await appFetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ password: edit.newPassword }),
    });

    setPasswordSavingId(null);

    if (!response.ok) {
      const data = await response.json();
      setLoadError(adminApiErrorMessage(data, t));
      return;
    }

    setEdit(user.id, { newPassword: "" });
    setPasswordSuccessId(user.id);
    window.setTimeout(() => {
      setPasswordSuccessId((current) => (current === user.id ? null : current));
    }, 3000);
  }

  async function saveUserEmail(user: UserRow) {
    const edit = edits[user.id];
    if (!edit) {
      return;
    }

    const email = edit.newEmail.trim().toLowerCase();
    if (!email || email === user.email.toLowerCase()) {
      return;
    }

    setEmailSavingId(user.id);
    setEmailSuccessId(null);
    setEmailErrors((current) => ({ ...current, [user.id]: null }));
    setLoadError(null);

    const response = await appFetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      body: JSON.stringify({ email }),
    });

    setEmailSavingId(null);

    if (!response.ok) {
      const data = await response.json();
      const message =
        data.error === "email_exists"
          ? t("emailExists")
          : adminApiErrorMessage(data, t);
      setEmailErrors((current) => ({ ...current, [user.id]: message }));
      return;
    }

    setEmailSuccessId(user.id);
    window.setTimeout(() => {
      setEmailSuccessId((current) => (current === user.id ? null : current));
    }, 3000);
    await refresh();
  }

  async function saveUserLimits(user: UserRow) {
    const edit = edits[user.id];
    if (!edit) {
      return;
    }

    await updateUser(user.id, {
      maxCalculators: edit.useDefaultLimit
        ? null
        : edit.maxCalculators === ""
          ? 0
          : Number(edit.maxCalculators),
      accessExpiresAt: edit.accessExpiresAt
        ? accessExpiresAtFromDateInput(edit.accessExpiresAt)
        : null,
      adminNotes: edit.adminNotes || null,
    });
  }

  async function handleCreateUser(e: React.FormEvent) {
    e.preventDefault();
    setCreating(true);
    setCreateError(null);

    const response = await appFetch("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({
        email: newUser.email,
        password: newUser.password,
        name: newUser.name || undefined,
        role: newUser.role,
        maxCalculators:
          newUser.maxCalculators === ""
            ? undefined
            : Number(newUser.maxCalculators),
        accessExpiresAt: newUser.accessExpiresAt
          ? new Date(`${newUser.accessExpiresAt}T23:59:59`).toISOString()
          : undefined,
      }),
    });

    const data = await response.json();
    setCreating(false);

    if (!response.ok) {
      setCreateError(
        data.error === "email_exists"
          ? t("emailExists")
          : adminApiErrorMessage(data, t),
      );
      return;
    }

    setNewUser({
      email: "",
      password: "",
      name: "",
      role: "USER",
      maxCalculators: "",
      accessExpiresAt: "",
    });
    await refresh();
  }

  function setEdit(userId: string, patch: Partial<UserEdit>) {
    setEdits((current) => ({
      ...current,
      [userId]: { ...current[userId], ...patch },
    }));
  }

  function extendAccess(userId: string, months: number) {
    const edit = edits[userId];
    const base = edit?.accessExpiresAt
      ? new Date(`${edit.accessExpiresAt}T12:00:00`)
      : new Date();
    if (base.getTime() < Date.now()) {
      base.setTime(Date.now());
    }
    setEdit(userId, {
      accessExpiresAt: formatDateInputLocal(addMonths(base, months)),
    });
  }

  function quotaLabel(user: UserRow) {
    if (user.role === "ADMIN" || user.effectiveMaxCalculators == null) {
      return t("unlimited");
    }
    return `${user.calculatorsCount} / ${user.effectiveMaxCalculators}`;
  }

  function accessLabel(user: UserRow) {
    return user.accessExpiresAt
      ? formatAccessDateShort(user.accessExpiresAt, locale)
      : t("accessUnlimited");
  }

  const manageUser = users.find((user) => user.id === manageUserId) ?? null;
  const manageEdit = manageUser ? edits[manageUser.id] : undefined;

  const inputClass =
    "block h-11 w-full rounded-xl border border-border bg-input px-3 text-base sm:h-10 sm:text-sm";

  const tableLabels = {
    loading: tc("loading"),
    noResults: t("usersNoResults"),
    refresh: t("refresh"),
    formatShowing: (from: number, to: number, total: number) =>
      t("usersShowing", { from, to, total }),
    formatPage: (pageNum: number, pages: number) =>
      t("usersPage", { page: pageNum, pages }),
    pageSize: t("usersPageSize"),
    prev: t("usersPrev"),
    next: t("usersNext"),
  };

  const userColumns: DataTableColumn<UserRow>[] = [
    {
      id: "email",
      header: tc("email"),
      cell: (user) => (
        <>
          <p className="font-medium">{user.email}</p>
          {user.name && (
            <p className="text-xs text-muted-foreground">{user.name}</p>
          )}
        </>
      ),
    },
    {
      id: "role",
      header: t("role"),
      cell: (user) => (
        <StatusBadge tone={user.role === "ADMIN" ? "accent" : "neutral"}>
          {user.role}
        </StatusBadge>
      ),
    },
    {
      id: "status",
      header: t("status"),
      cell: (user) => <UserStatusSection user={user} t={t} tc={tc} />,
    },
    {
      id: "access",
      header: t("access"),
      cellClassName: "text-xs",
      cell: (user) => accessLabel(user),
    },
    {
      id: "quota",
      header: t("calculatorsQuota"),
      cell: (user) => quotaLabel(user),
    },
    {
      id: "actions",
      header: t("actions"),
      headerClassName: "text-right",
      cellClassName: "text-right",
      cell: (user) => (
        <Button
          type="button"
          variant="outline"
          className="h-8 px-3 text-xs"
          onClick={() => setManageUserId(user.id)}
        >
          {t("manage")}
        </Button>
      ),
    },
  ];

  function renderUserMobileCard(user: UserRow) {
    return (
      <article key={user.id} className="bg-card/90">
        <div className="space-y-3 p-4">
          <div>
            <p className="break-all font-medium text-foreground">
              {user.email}
            </p>
            {user.name && (
              <p className="mt-0.5 text-sm text-muted-foreground">
                {user.name}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <StatusBadge tone={user.role === "ADMIN" ? "accent" : "neutral"}>
              {user.role}
            </StatusBadge>
            <UserStatusSection user={user} t={t} tc={tc} />
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
            <div>
              <dt className="text-xs text-muted-foreground">{t("access")}</dt>
              <dd className="font-medium">{accessLabel(user)}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted-foreground">
                {t("calculatorsQuota")}
              </dt>
              <dd className="font-medium">{quotaLabel(user)}</dd>
            </div>
          </dl>

          <Button
            type="button"
            variant="outline"
            className="h-11 w-full text-sm"
            onClick={() => setManageUserId(user.id)}
          >
            {t("manage")}
          </Button>
        </div>
      </article>
    );
  }

  return (
    <div className="space-y-6">
      <AdminErrorAlert message={loadError} />
      <Card>
        <CardTitle className="mb-4">{t("createUser")}</CardTitle>
        <form
          onSubmit={handleCreateUser}
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        >
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">{tc("email")}</span>
            <input
              type="email"
              required
              value={newUser.email}
              onChange={(e) =>
                setNewUser((u) => ({ ...u, email: e.target.value }))
              }
              className={inputClass}
            />
          </label>
          <div className="space-y-1">
            <label
              htmlFor="admin-new-user-password"
              className="text-sm text-muted-foreground"
            >
              {tc("password")}
            </label>
            <PasswordInput
              id="admin-new-user-password"
              required
              minLength={8}
              autoComplete="new-password"
              value={newUser.password}
              onChange={(e) =>
                setNewUser((u) => ({ ...u, password: e.target.value }))
              }
              inputClassName={`${inputClass} py-0 pl-3 pr-12`}
            />
          </div>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">{tc("name")}</span>
            <input
              type="text"
              value={newUser.name}
              onChange={(e) =>
                setNewUser((u) => ({ ...u, name: e.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">{t("role")}</span>
            <select
              value={newUser.role}
              onChange={(e) =>
                setNewUser((u) => ({
                  ...u,
                  role: e.target.value as "USER" | "ADMIN",
                }))
              }
              className={inputClass}
            >
              <option value="USER">USER</option>
              <option value="ADMIN">ADMIN</option>
            </select>
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">
              {t("maxCalculators")}
            </span>
            <input
              type="number"
              min={0}
              placeholder={String(defaultMax)}
              value={newUser.maxCalculators}
              onChange={(e) =>
                setNewUser((u) => ({ ...u, maxCalculators: e.target.value }))
              }
              className={inputClass}
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">
              {t("accessUntil")}
            </span>
            <input
              type="date"
              value={newUser.accessExpiresAt}
              onChange={(e) =>
                setNewUser((u) => ({ ...u, accessExpiresAt: e.target.value }))
              }
              className={inputClass}
            />
          </label>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={creating} className="h-11 w-full sm:w-auto">
              {creating ? t("creatingUser") : t("createUser")}
            </Button>
          </div>
        </form>
        {createError && (
          <p className="mt-3 text-sm text-destructive">{createError}</p>
        )}
      </Card>

      <DataTable<UserRow>
        title={t("usersListTitle")}
        columns={userColumns}
        rows={users}
        rowKey={(user) => user.id}
        labels={tableLabels}
        pagination={pagination}
        pageSize={pageSize}
        loading={loading}
        onPageChange={setPage}
        onPageSizeChange={setPageSize}
        onRefresh={() => void refresh()}
        minTableWidth="960px"
        renderMobileCard={renderUserMobileCard}
        toolbar={
          <label className="block space-y-1">
            <span className="sr-only">{t("usersSearchPlaceholder")}</span>
            <input
              type="search"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              placeholder={t("usersSearchPlaceholder")}
              className={inputClass}
              autoComplete="off"
            />
          </label>
        }
      />

      {manageUser && (
        <AdminUserManageModal
          user={manageUser}
          open={manageUserId !== null}
          onClose={() => {
            setManageUserId(null);
            setPendingBanId(null);
          }}
          edit={manageEdit}
          defaultMax={defaultMax}
          pendingBanId={pendingBanId}
          banReason={banReason}
          passwordSaving={passwordSavingId === manageUser.id}
          passwordSuccess={passwordSuccessId === manageUser.id}
          emailSaving={emailSavingId === manageUser.id}
          emailSuccess={emailSuccessId === manageUser.id}
          emailError={emailErrors[manageUser.id] ?? null}
          onToggleRole={() =>
            updateUser(manageUser.id, {
              role: manageUser.role === "ADMIN" ? "USER" : "ADMIN",
            })
          }
          onUnban={() => {
            setPendingBanId(null);
            updateUser(manageUser.id, { banned: false });
          }}
          onStartBan={() => {
            setBanReason("ACCESS_EXPIRED");
            setPendingBanId(manageUser.id);
          }}
          onCancelBan={() => setPendingBanId(null)}
          onConfirmBan={() => {
            updateUser(manageUser.id, { banned: true, banReason });
            setPendingBanId(null);
          }}
          onBanReasonChange={setBanReason}
          onEditChange={(patch) => setEdit(manageUser.id, patch)}
          onExtendAccess={(months) => extendAccess(manageUser.id, months)}
          onSave={() => saveUserLimits(manageUser)}
          onSetPassword={() => saveUserPassword(manageUser)}
          onSetEmail={() => saveUserEmail(manageUser)}
        />
      )}
    </div>
  );
}
