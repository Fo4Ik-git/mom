"use client";

import { useTranslations } from "next-intl";
import { Fragment, useEffect, useState, type ReactNode } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardTitle } from "@/app/components/ui/card";
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

export function AdminUsers() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [users, setUsers] = useState<UserRow[]>([]);
  const [defaultMax, setDefaultMax] = useState(5);
  const [expandedId, setExpandedId] = useState<string | null>(null);
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

  const [edits, setEdits] = useState<
    Record<
      string,
      {
        maxCalculators: string;
        accessExpiresAt: string;
        adminNotes: string;
        useDefaultLimit: boolean;
      }
    >
  >({});

  async function load() {
    setLoadError(null);
    const response = await appFetch("/api/admin/users");
    const data = await response.json();
    if (!response.ok) {
      setLoadError(adminApiErrorMessage(data, t));
      setUsers([]);
      return;
    }
    setUsers(data.users ?? []);
    if (typeof data.defaultMaxCalculators === "number") {
      setDefaultMax(data.defaultMaxCalculators);
    }

    const nextEdits: typeof edits = {};
    for (const user of data.users ?? []) {
      nextEdits[user.id] = {
        maxCalculators:
          user.maxCalculators != null ? String(user.maxCalculators) : "",
        accessExpiresAt: formatDateInput(user.accessExpiresAt),
        adminNotes: user.adminNotes ?? "",
        useDefaultLimit: user.usesDefaultLimit,
      };
    }
    setEdits(nextEdits);
  }

  useEffect(() => {
    load();
  }, []);

  async function updateUser(
    id: string,
    patch: Record<string, unknown>,
  ) {
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

  function setEdit(
    userId: string,
    patch: Partial<(typeof edits)[string]>,
  ) {
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

  return (
    <div className="space-y-6">
      <AdminErrorAlert message={loadError} />
      <Card>
        <CardTitle className="mb-4">{t("createUser")}</CardTitle>
        <form onSubmit={handleCreateUser} className="grid gap-3 sm:grid-cols-2">
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">{tc("email")}</span>
            <input
              type="email"
              required
              value={newUser.email}
              onChange={(e) =>
                setNewUser((u) => ({ ...u, email: e.target.value }))
              }
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">{tc("password")}</span>
            <input
              type="password"
              required
              minLength={8}
              value={newUser.password}
              onChange={(e) =>
                setNewUser((u) => ({ ...u, password: e.target.value }))
              }
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
            />
          </label>
          <label className="space-y-1">
            <span className="text-sm text-muted-foreground">{tc("name")}</span>
            <input
              type="text"
              value={newUser.name}
              onChange={(e) =>
                setNewUser((u) => ({ ...u, name: e.target.value }))
              }
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
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
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
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
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
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
              className="block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
            />
          </label>
          <div className="flex items-end sm:col-span-2">
            <Button type="submit" disabled={creating}>
              {creating ? t("creatingUser") : t("createUser")}
            </Button>
          </div>
        </form>
        {createError && (
          <p className="mt-3 text-sm text-destructive">{createError}</p>
        )}
      </Card>

      <div className="overflow-x-auto rounded-2xl border border-border bg-card/90 shadow-card">
        <table className="w-full min-w-[900px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-3 font-medium">{tc("email")}</th>
              <th className="px-4 py-3 font-medium">{t("role")}</th>
              <th className="px-4 py-3 font-medium">{t("status")}</th>
              <th className="px-4 py-3 font-medium">{t("access")}</th>
              <th className="px-4 py-3 font-medium">{t("calculatorsQuota")}</th>
              <th className="px-4 py-3 text-right font-medium">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {users.map((user) => {
              const edit = edits[user.id];
              const isExpanded = expandedId === user.id;
              const quotaLabel =
                user.role === "ADMIN"
                  ? t("unlimited")
                  : user.effectiveMaxCalculators == null
                    ? t("unlimited")
                    : `${user.calculatorsCount} / ${user.effectiveMaxCalculators}`;

              return (
                <Fragment key={user.id}>
                  <tr className="border-b border-border/60">
                    <td className="px-4 py-3">
                      <p className="font-medium">{user.email}</p>
                      {user.name && (
                        <p className="text-xs text-muted-foreground">
                          {user.name}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge
                        tone={user.role === "ADMIN" ? "accent" : "neutral"}
                      >
                        {user.role}
                      </StatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      {user.banned ? (
                        <div className="space-y-1">
                          <StatusBadge tone="danger">{tc("banned")}</StatusBadge>
                          {user.banReason && (
                            <p className="text-[11px] text-muted-foreground">
                              {t(`banReason_${user.banReason}`)}
                            </p>
                          )}
                        </div>
                      ) : user.accessActive ? (
                        <StatusBadge tone="success">{tc("active")}</StatusBadge>
                      ) : (
                        <StatusBadge tone="warning">
                          {t("accessExpired")}
                        </StatusBadge>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {user.accessExpiresAt
                        ? new Date(user.accessExpiresAt).toLocaleDateString()
                        : t("accessUnlimited")}
                    </td>
                    <td className="px-4 py-3">{quotaLabel}</td>
                    <td className="px-4 py-3 text-right">
                      <Button
                        type="button"
                        variant={isExpanded ? "primary" : "outline"}
                        className="h-9 px-4 text-xs"
                        onClick={() =>
                          setExpandedId(isExpanded ? null : user.id)
                        }
                      >
                        {t("manage")}
                      </Button>
                    </td>
                  </tr>
                  {isExpanded && edit && (
                    <tr className="bg-muted/25">
                      <td colSpan={6} className="border-b border-border/60 px-4 py-5">
                        <p className="mb-4 text-sm font-semibold text-foreground">
                          {user.email}
                        </p>
                        <div className="mb-5 flex flex-wrap gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            className="h-9 px-4 text-xs"
                            onClick={() =>
                              updateUser(user.id, {
                                role: user.role === "ADMIN" ? "USER" : "ADMIN",
                              })
                            }
                          >
                            {user.role === "ADMIN"
                              ? t("removeAdmin")
                              : t("makeAdmin")}
                          </Button>
                          {user.banned ? (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 px-4 text-xs"
                              onClick={() => {
                                setPendingBanId(null);
                                updateUser(user.id, { banned: false });
                              }}
                            >
                              {t("unban")}
                            </Button>
                          ) : pendingBanId === user.id ? (
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-9 px-4 text-xs"
                              onClick={() => setPendingBanId(null)}
                            >
                              {t("banCancel")}
                            </Button>
                          ) : (
                            <Button
                              type="button"
                              variant="outline"
                              className="h-9 border-destructive/40 px-4 text-xs text-destructive hover:bg-destructive/10"
                              onClick={() => {
                                setBanReason("ACCESS_EXPIRED");
                                setPendingBanId(user.id);
                              }}
                            >
                              {t("ban")}
                            </Button>
                          )}
                        </div>
                        {pendingBanId === user.id && !user.banned && (
                          <div className="mb-5 flex flex-wrap items-end gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                            <label className="min-w-[200px] flex-1 space-y-1.5">
                              <span className="text-sm font-medium text-foreground">
                                {t("banSelectReason")}
                              </span>
                              <select
                                value={banReason}
                                onChange={(e) =>
                                  setBanReason(
                                    e.target.value as "ACCESS_EXPIRED",
                                  )
                                }
                                className="block h-10 w-full max-w-sm rounded-xl border border-border bg-input px-3 text-sm"
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
                              className="h-10 bg-destructive px-4 text-xs text-destructive-foreground hover:brightness-110"
                              onClick={() => {
                                updateUser(user.id, {
                                  banned: true,
                                  banReason,
                                });
                                setPendingBanId(null);
                              }}
                            >
                              {t("banConfirm")}
                            </Button>
                          </div>
                        )}
                        <div className="grid gap-4 lg:grid-cols-2">
                          <div className="space-y-3">
                            <p className="text-sm font-semibold">
                              {t("limitsTitle")}
                            </p>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                checked={edit.useDefaultLimit}
                                disabled={user.role === "ADMIN"}
                                onChange={(e) =>
                                  setEdit(user.id, {
                                    useDefaultLimit: e.target.checked,
                                  })
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
                                    setEdit(user.id, {
                                      maxCalculators: e.target.value,
                                    })
                                  }
                                  className="block h-10 w-full max-w-xs rounded-xl border border-border bg-input px-3 text-sm"
                                />
                              </label>
                            )}
                          </div>
                          <div className="space-y-3">
                            <p className="text-sm font-semibold">
                              {t("accessTitle")}
                            </p>
                            <label className="block space-y-1">
                              <span className="text-sm text-muted-foreground">
                                {t("accessUntil")}
                              </span>
                              <input
                                type="date"
                                value={edit.accessExpiresAt}
                                onChange={(e) =>
                                  setEdit(user.id, {
                                    accessExpiresAt: e.target.value,
                                  })
                                }
                                className="block h-10 w-full max-w-xs rounded-xl border border-border bg-input px-3 text-sm"
                              />
                            </label>
                            <div className="flex flex-wrap gap-2">
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => extendAccess(user.id, 1)}
                              >
                                {t("extend1Month")}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() => extendAccess(user.id, 12)}
                              >
                                {t("extend1Year")}
                              </Button>
                              <Button
                                type="button"
                                variant="outline"
                                onClick={() =>
                                  setEdit(user.id, { accessExpiresAt: "" })
                                }
                              >
                                {t("accessUnlimited")}
                              </Button>
                            </div>
                          </div>
                          <label className="block space-y-1 lg:col-span-2">
                            <span className="text-sm text-muted-foreground">
                              {t("adminNotes")}
                            </span>
                            <textarea
                              rows={2}
                              value={edit.adminNotes}
                              onChange={(e) =>
                                setEdit(user.id, { adminNotes: e.target.value })
                              }
                              className="block w-full rounded-xl border border-border bg-input px-3 py-2 text-sm"
                            />
                          </label>
                          <div className="lg:col-span-2">
                            <Button
                              type="button"
                              className="h-9 px-5 text-sm"
                              onClick={() => saveUserLimits(user)}
                            >
                              {tc("save")}
                            </Button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
