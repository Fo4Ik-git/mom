"use client";

import { useTranslations } from "next-intl";
import {
  Fragment,
  useCallback,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  ADMIN_USERS_PAGE_SIZES,
  type AdminUsersPageSize,
} from "@/lib/admin-users-list";
import { Button } from "@/app/components/ui/button";
import { Card, CardTitle } from "@/app/components/ui/card";
import { PasswordInput } from "@/app/components/ui/password-input";
import { AdminErrorAlert } from "@/app/components/admin/admin-error-alert";
import { appFetch } from "@/lib/api-client";
import { adminApiErrorMessage } from "@/lib/admin-api-error";
import { BAN_REASON_CODES } from "@/lib/ban-reasons";

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

type UserEdit = {
  maxCalculators: string;
  accessExpiresAt: string;
  adminNotes: string;
  useDefaultLimit: boolean;
};

function formatDateInput(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return date.toISOString().slice(0, 10);
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

function UserManagePanel({
  user,
  edit,
  defaultMax,
  pendingBanId,
  banReason,
  t,
  tc,
  onToggleRole,
  onUnban,
  onStartBan,
  onCancelBan,
  onConfirmBan,
  onBanReasonChange,
  onEditChange,
  onExtendAccess,
  onSave,
}: {
  user: UserRow;
  edit: UserEdit;
  defaultMax: number;
  pendingBanId: string | null;
  banReason: "ACCESS_EXPIRED";
  t: ReturnType<typeof useTranslations<"admin">>;
  tc: ReturnType<typeof useTranslations<"common">>;
  onToggleRole: () => void;
  onUnban: () => void;
  onStartBan: () => void;
  onCancelBan: () => void;
  onConfirmBan: () => void;
  onBanReasonChange: (reason: "ACCESS_EXPIRED") => void;
  onEditChange: (patch: Partial<UserEdit>) => void;
  onExtendAccess: (months: number) => void;
  onSave: () => void;
}) {
  return (
    <div className="border-t border-border/60 bg-muted/25 px-4 py-5">
      <div className="mb-5 flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          className="h-10 min-h-[44px] flex-1 px-4 text-xs sm:flex-none sm:text-sm"
          onClick={onToggleRole}
        >
          {user.role === "ADMIN" ? t("removeAdmin") : t("makeAdmin")}
        </Button>
        {user.banned ? (
          <Button
            type="button"
            variant="outline"
            className="h-10 min-h-[44px] flex-1 px-4 text-xs sm:flex-none sm:text-sm"
            onClick={onUnban}
          >
            {t("unban")}
          </Button>
        ) : pendingBanId === user.id ? (
          <Button
            type="button"
            variant="ghost"
            className="h-10 min-h-[44px] flex-1 px-4 text-xs sm:flex-none sm:text-sm"
            onClick={onCancelBan}
          >
            {t("banCancel")}
          </Button>
        ) : (
          <Button
            type="button"
            variant="outline"
            className="h-10 min-h-[44px] flex-1 border-destructive/40 px-4 text-xs text-destructive hover:bg-destructive/10 sm:flex-none sm:text-sm"
            onClick={onStartBan}
          >
            {t("ban")}
          </Button>
        )}
      </div>

      {pendingBanId === user.id && !user.banned && (
        <div className="mb-5 space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
          <label className="block space-y-1.5">
            <span className="text-sm font-medium text-foreground">
              {t("banSelectReason")}
            </span>
            <select
              value={banReason}
              onChange={(e) =>
                onBanReasonChange(e.target.value as "ACCESS_EXPIRED")
              }
              className="block h-11 w-full rounded-xl border border-border bg-input px-3 text-base sm:text-sm"
            >
              {BAN_REASON_CODES.map((code) => (
                <option key={code} value={code}>
                  {t(`banReason_${code}`)}
                </option>
              ))}
            </select>
          </label>
          <Button
            type="button"
            className="h-11 w-full bg-destructive text-sm text-destructive-foreground hover:brightness-110 sm:w-auto"
            onClick={onConfirmBan}
          >
            {t("banConfirm")}
          </Button>
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="space-y-3">
          <p className="text-sm font-semibold">{t("limitsTitle")}</p>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={edit.useDefaultLimit}
              disabled={user.role === "ADMIN"}
              onChange={(e) =>
                onEditChange({ useDefaultLimit: e.target.checked })
              }
            />
            {t("useDefaultLimit", { max: defaultMax })}
          </label>
          {!edit.useDefaultLimit && user.role !== "ADMIN" && (
            <label className="block space-y-1">
              <span className="text-sm text-muted-foreground">
                {t("maxCalculators")}
              </span>
              <input
                type="number"
                min={0}
                value={edit.maxCalculators}
                onChange={(e) =>
                  onEditChange({ maxCalculators: e.target.value })
                }
                className="block h-11 w-full rounded-xl border border-border bg-input px-3 text-base sm:max-w-xs sm:text-sm"
              />
            </label>
          )}
        </div>
        <div className="space-y-3">
          <p className="text-sm font-semibold">{t("accessTitle")}</p>
          <label className="block space-y-1">
            <span className="text-sm text-muted-foreground">
              {t("accessUntil")}
            </span>
            <input
              type="date"
              value={edit.accessExpiresAt}
              onChange={(e) =>
                onEditChange({ accessExpiresAt: e.target.value })
              }
              className="block h-11 w-full rounded-xl border border-border bg-input px-3 text-base sm:max-w-xs sm:text-sm"
            />
          </label>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full text-xs sm:w-auto sm:text-sm"
              onClick={() => onExtendAccess(1)}
            >
              {t("extend1Month")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full text-xs sm:w-auto sm:text-sm"
              onClick={() => onExtendAccess(12)}
            >
              {t("extend1Year")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 w-full text-xs sm:w-auto sm:text-sm"
              onClick={() => onEditChange({ accessExpiresAt: "" })}
            >
              {t("accessUnlimited")}
            </Button>
          </div>
        </div>
        <label className="block space-y-1 lg:col-span-2">
          <span className="text-sm text-muted-foreground">{t("adminNotes")}</span>
          <textarea
            rows={2}
            value={edit.adminNotes}
            onChange={(e) => onEditChange({ adminNotes: e.target.value })}
            className="block w-full rounded-xl border border-border bg-input px-3 py-2 text-base sm:text-sm"
          />
        </label>
        <div className="lg:col-span-2">
          <Button
            type="button"
            className="h-11 w-full text-sm sm:w-auto"
            onClick={onSave}
          >
            {tc("save")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export function AdminUsers() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [defaultMax, setDefaultMax] = useState(5);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [pendingBanId, setPendingBanId] = useState<string | null>(null);
  const [banReason, setBanReason] = useState<"ACCESS_EXPIRED">("ACCESS_EXPIRED");
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<AdminUsersPageSize>(10);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  const [newUser, setNewUser] = useState({
    email: "",
    password: "",
    name: "",
    role: "USER" as "USER" | "ADMIN",
    maxCalculators: "",
    accessExpiresAt: "",
  });

  const [edits, setEdits] = useState<Record<string, UserEdit>>({});

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);

    const params = new URLSearchParams({
      page: String(page),
      pageSize: String(pageSize),
    });
    if (searchQuery) {
      params.set("q", searchQuery);
    }

    const response = await appFetch(`/api/admin/users?${params}`);
    const data = await response.json();
    setLoading(false);

    if (!response.ok) {
      setLoadError(adminApiErrorMessage(data, t));
      setUsers([]);
      return;
    }

    const loadedUsers: UserRow[] = data.users ?? [];
    setUsers(loadedUsers);
    if (typeof data.defaultMaxCalculators === "number") {
      setDefaultMax(data.defaultMaxCalculators);
    }
    if (data.pagination) {
      setPagination(data.pagination);
      if (data.pagination.page !== page) {
        setPage(data.pagination.page);
      }
    }

    setEdits((current) => {
      const next = { ...current };
      for (const user of loadedUsers) {
        next[user.id] = {
          maxCalculators:
            user.maxCalculators != null ? String(user.maxCalculators) : "",
          accessExpiresAt: formatDateInput(user.accessExpiresAt),
          adminNotes: user.adminNotes ?? "",
          useDefaultLimit: user.usesDefaultLimit,
        };
      }
      return next;
    });

    setExpandedId((current) =>
      current && loadedUsers.some((u) => u.id === current) ? current : null,
    );
  }, [page, pageSize, searchQuery, t]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(timer);
  }, [searchInput]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  useEffect(() => {
    load();
  }, [load]);

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
    await load();
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
        ? new Date(`${edit.accessExpiresAt}T23:59:59`).toISOString()
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
    await load();
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
      accessExpiresAt: formatDateInput(addMonths(base, months)),
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
      ? new Date(user.accessExpiresAt).toLocaleDateString()
      : t("accessUnlimited");
  }

  function renderManagePanel(user: UserRow, edit: UserEdit) {
    return (
      <UserManagePanel
        user={user}
        edit={edit}
        defaultMax={defaultMax}
        pendingBanId={pendingBanId}
        banReason={banReason}
        t={t}
        tc={tc}
        onToggleRole={() =>
          updateUser(user.id, {
            role: user.role === "ADMIN" ? "USER" : "ADMIN",
          })
        }
        onUnban={() => {
          setPendingBanId(null);
          updateUser(user.id, { banned: false });
        }}
        onStartBan={() => {
          setBanReason("ACCESS_EXPIRED");
          setPendingBanId(user.id);
        }}
        onCancelBan={() => setPendingBanId(null)}
        onConfirmBan={() => {
          updateUser(user.id, { banned: true, banReason });
          setPendingBanId(null);
        }}
        onBanReasonChange={setBanReason}
        onEditChange={(patch) => setEdit(user.id, patch)}
        onExtendAccess={(months) => extendAccess(user.id, months)}
        onSave={() => saveUserLimits(user)}
      />
    );
  }

  const inputClass =
    "block h-11 w-full rounded-xl border border-border bg-input px-3 text-base sm:h-10 sm:text-sm";

  const rangeFrom =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1;
  const rangeTo = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total,
  );

  function renderUserMobileCard(user: UserRow) {
    const edit = edits[user.id];
    const isExpanded = expandedId === user.id;

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
            variant={isExpanded ? "primary" : "outline"}
            className="h-11 w-full text-sm"
            onClick={() => setExpandedId(isExpanded ? null : user.id)}
          >
            {isExpanded ? t("hideDetails") : t("manage")}
          </Button>
        </div>

        {isExpanded && edit && renderManagePanel(user, edit)}
      </article>
    );
  }

  function renderUserTableRow(user: UserRow) {
    const edit = edits[user.id];
    const isExpanded = expandedId === user.id;

    return (
      <Fragment key={user.id}>
        <tr className="border-b border-border/60">
          <td className="px-4 py-3">
            <p className="font-medium">{user.email}</p>
            {user.name && (
              <p className="text-xs text-muted-foreground">{user.name}</p>
            )}
          </td>
          <td className="px-4 py-3">
            <StatusBadge tone={user.role === "ADMIN" ? "accent" : "neutral"}>
              {user.role}
            </StatusBadge>
          </td>
          <td className="px-4 py-3">
            <UserStatusSection user={user} t={t} tc={tc} />
          </td>
          <td className="px-4 py-3 text-xs">{accessLabel(user)}</td>
          <td className="px-4 py-3">{quotaLabel(user)}</td>
          <td className="px-4 py-3 text-right">
            <Button
              type="button"
              variant={isExpanded ? "primary" : "outline"}
              className="h-9 px-4 text-xs"
              onClick={() => setExpandedId(isExpanded ? null : user.id)}
            >
              {isExpanded ? t("hideDetails") : t("manage")}
            </Button>
          </td>
        </tr>
        {isExpanded && edit && (
          <tr>
            <td colSpan={6} className="p-0">
              {renderManagePanel(user, edit)}
            </td>
          </tr>
        )}
      </Fragment>
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

      <Card className="overflow-hidden p-0">
        <div className="space-y-3 border-b border-border p-4">
          <CardTitle className="mb-0">{t("usersListTitle")}</CardTitle>
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
          <p className="text-sm text-muted-foreground">
            {loading
              ? tc("loading")
              : pagination.total === 0
                ? t("usersNoResults")
                : t("usersShowing", {
                    from: rangeFrom,
                    to: rangeTo,
                    total: pagination.total,
                  })}
          </p>
        </div>

        {loading ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {tc("loading")}
          </p>
        ) : users.length === 0 ? (
          <p className="px-4 py-10 text-center text-sm text-muted-foreground">
            {t("usersNoResults")}
          </p>
        ) : (
          <>
            <div className="divide-y divide-border lg:hidden">
              {users.map(renderUserMobileCard)}
            </div>

            <div className="hidden lg:block">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-border bg-muted/40">
                  <tr>
                    <th className="px-4 py-3 font-medium">{tc("email")}</th>
                    <th className="px-4 py-3 font-medium">{t("role")}</th>
                    <th className="px-4 py-3 font-medium">{t("status")}</th>
                    <th className="px-4 py-3 font-medium">{t("access")}</th>
                    <th className="px-4 py-3 font-medium">
                      {t("calculatorsQuota")}
                    </th>
                    <th className="px-4 py-3 text-right font-medium">
                      {t("actions")}
                    </th>
                  </tr>
                </thead>
                <tbody>{users.map(renderUserTableRow)}</tbody>
              </table>
            </div>
          </>
        )}

        <div className="flex flex-col gap-3 border-t border-border p-4">
          <p className="text-sm text-muted-foreground">
            {t("usersPage", {
              page: pagination.page,
              pages: pagination.totalPages,
            })}
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <label className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
              <span className="text-muted-foreground">{t("usersPageSize")}</span>
              <select
                value={pageSize}
                onChange={(e) =>
                  setPageSize(Number(e.target.value) as AdminUsersPageSize)
                }
                className="h-11 w-full rounded-xl border border-border bg-input px-3 text-base sm:h-10 sm:w-32 sm:text-sm"
              >
                {ADMIN_USERS_PAGE_SIZES.map((size) => (
                  <option key={size} value={size}>
                    {size}
                  </option>
                ))}
              </select>
            </label>
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 sm:flex-none"
                disabled={loading || pagination.page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                {t("usersPrev")}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="h-10 flex-1 sm:flex-none"
                disabled={loading || pagination.page >= pagination.totalPages}
                onClick={() =>
                  setPage((p) => Math.min(pagination.totalPages, p + 1))
                }
              >
                {t("usersNext")}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
}
