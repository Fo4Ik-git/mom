"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import {
  AdminManageModal,
  type AdminManageSection,
} from "@/app/components/admin/admin-manage-modal";
import { Button } from "@/app/components/ui/button";
import { PasswordInput } from "@/app/components/ui/password-input";
import { appFetch } from "@/lib/api/api-client";
import { adminApiErrorMessage } from "@/lib/admin/admin-api-error";
import { BAN_REASON_CODES } from "@/lib/access/ban-reasons";
import type { ReferralKeyDto } from "@/lib/access/referral-key-display";

export type UserRowForManage = {
  id: string;
  email: string;
  name: string | null;
  role: "USER" | "ADMIN";
  banned: boolean;
};

export type UserEdit = {
  maxCalculators: string;
  accessExpiresAt: string;
  adminNotes: string;
  useDefaultLimit: boolean;
  newPassword: string;
  newEmail: string;
};

function UserReferralSection({
  userId,
  email,
}: {
  userId: string;
  email: string;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [loading, setLoading] = useState(true);
  const [granted, setGranted] = useState(false);
  const [code, setCode] = useState("");
  const [referral, setReferral] = useState<ReferralKeyDto | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await appFetch(`/api/admin/users/${userId}/referral`);
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setError(adminApiErrorMessage(data, t));
      return;
    }
    setGranted(data.granted === true);
    setReferral(data.referral ?? null);
    setCode(data.referral?.code ?? "");
  }, [userId, t]);

  useEffect(() => {
    void load();
  }, [load]);

  async function save(grant: boolean) {
    setSaving(true);
    setError(null);
    const codeTrimmed = code.trim();
    if (grant && codeTrimmed.length > 0 && codeTrimmed.length < 4) {
      setError(t("userReferralCodeTooShort"));
      setSaving(false);
      return;
    }
    const res = await appFetch(`/api/admin/users/${userId}/referral`, {
      method: "PUT",
      body: JSON.stringify({
        granted: grant,
        code: codeTrimmed || undefined,
      }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      const message =
        data.error === "code_exists"
          ? t("userReferralCodeExists")
          : data.error === "invalid_code"
            ? t("userReferralCodeTooShort")
            : adminApiErrorMessage(data, t);
      setError(message);
      return;
    }
    setGranted(data.granted === true);
    setReferral(data.referral ?? null);
    if (data.referral?.code) {
      setCode(data.referral.code);
    }
  }

  if (loading) {
    return <p className="text-sm text-muted-foreground">{tc("loading")}</p>;
  }

  const inputClass =
    "block h-11 w-full max-w-md rounded-xl border border-border bg-input px-3 text-base sm:text-sm";

  return (
    <div className="max-w-md space-y-4">
      <p className="text-sm text-muted-foreground">
        {t("userReferralHint", { email })}
      </p>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          checked={granted}
          onChange={(e) => {
            setGranted(e.target.checked);
            if (!e.target.checked) {
              setCode("");
            } else if (referral?.code) {
              setCode(referral.code);
            }
          }}
        />
        {t("userReferralGrant")}
      </label>
      {granted && (
        <label className="block space-y-1">
          <span className="text-sm text-muted-foreground">
            {t("accessKeyCode")}
          </span>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder={t("userReferralCodePlaceholder")}
            className={`${inputClass} font-mono tracking-wide`}
            autoComplete="off"
          />
        </label>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          disabled={saving}
          onClick={() => save(granted)}
        >
          {saving ? tc("loading") : t("userReferralSave")}
        </Button>
        {referral && (
          <Button
            type="button"
            variant="outline"
            disabled={saving}
            onClick={() => save(false)}
          >
            {t("userReferralRevoke")}
          </Button>
        )}
      </div>
    </div>
  );
}

export function AdminUserManageModal({
  user,
  open,
  onClose,
  edit,
  defaultMax,
  pendingBanId,
  banReason,
  passwordSaving,
  passwordSuccess,
  emailSaving,
  emailSuccess,
  emailError,
  onToggleRole,
  onUnban,
  onStartBan,
  onCancelBan,
  onConfirmBan,
  onBanReasonChange,
  onEditChange,
  onExtendAccess,
  onSave,
  onSetPassword,
  onSetEmail,
}: {
  user: UserRowForManage | null;
  open: boolean;
  onClose: () => void;
  edit: UserEdit | undefined;
  defaultMax: number;
  pendingBanId: string | null;
  banReason: "ACCESS_EXPIRED";
  passwordSaving: boolean;
  passwordSuccess: boolean;
  emailSaving: boolean;
  emailSuccess: boolean;
  emailError: string | null;
  onToggleRole: () => void;
  onUnban: () => void;
  onStartBan: () => void;
  onCancelBan: () => void;
  onConfirmBan: () => void;
  onBanReasonChange: (reason: "ACCESS_EXPIRED") => void;
  onEditChange: (patch: Partial<UserEdit>) => void;
  onExtendAccess: (months: number) => void;
  onSave: () => void;
  onSetPassword: () => void;
  onSetEmail: () => void;
}) {
  const t = useTranslations("admin");
  const tc = useTranslations("common");

  if (!user || !edit) {
    return null;
  }

  const inputClass =
    "block h-11 w-full max-w-md rounded-xl border border-border bg-input px-3 text-base sm:text-sm";

  const sections: AdminManageSection[] = [
    {
      id: "account",
      label: t("manageSectionAccount"),
      content: (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" onClick={onToggleRole}>
              {user.role === "ADMIN" ? t("removeAdmin") : t("makeAdmin")}
            </Button>
            {user.banned ? (
              <Button type="button" variant="outline" onClick={onUnban}>
                {t("unban")}
              </Button>
            ) : pendingBanId === user.id ? (
              <Button type="button" variant="ghost" onClick={onCancelBan}>
                {t("banCancel")}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="border-destructive/40 text-destructive hover:bg-destructive/10"
                onClick={onStartBan}
              >
                {t("ban")}
              </Button>
            )}
          </div>
          {pendingBanId === user.id && !user.banned && (
            <div className="space-y-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
              <label className="block space-y-1.5">
                <span className="text-sm font-medium">{t("banSelectReason")}</span>
                <select
                  value={banReason}
                  onChange={(e) =>
                    onBanReasonChange(e.target.value as "ACCESS_EXPIRED")
                  }
                  className={inputClass}
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
                className="bg-destructive text-destructive-foreground hover:brightness-110"
                onClick={onConfirmBan}
              >
                {t("banConfirm")}
              </Button>
            </div>
          )}
        </div>
      ),
    },
    {
      id: "limits",
      label: t("manageSectionLimits"),
      content: (
        <div className="max-w-md space-y-3">
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
                className={inputClass}
              />
            </label>
          )}
        </div>
      ),
    },
    {
      id: "access",
      label: t("manageSectionAccess"),
      content: (
        <div className="max-w-md space-y-3">
          <label className="block space-y-1">
            <span className="text-sm text-muted-foreground">{t("accessUntil")}</span>
            <input
              type="date"
              value={edit.accessExpiresAt}
              onChange={(e) =>
                onEditChange({ accessExpiresAt: e.target.value })
              }
              className={inputClass}
            />
          </label>
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-10 text-xs sm:text-sm"
              onClick={() => onExtendAccess(1)}
            >
              {t("extend1Month")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 text-xs sm:text-sm"
              onClick={() => onExtendAccess(12)}
            >
              {t("extend1Year")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 text-xs sm:text-sm"
              onClick={() => onEditChange({ accessExpiresAt: "" })}
            >
              {t("accessUnlimited")}
            </Button>
          </div>
        </div>
      ),
    },
    {
      id: "credentials",
      label: t("manageSectionCredentials"),
      content: (
        <div className="grid max-w-2xl gap-6 sm:grid-cols-2">
          <div className="space-y-3">
            <p className="text-sm font-semibold">{t("changePasswordTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("changePasswordHint")}</p>
            <PasswordInput
              id={`admin-user-password-${user.id}`}
              minLength={8}
              autoComplete="new-password"
              value={edit.newPassword}
              onChange={(e) => onEditChange({ newPassword: e.target.value })}
              inputClassName={`${inputClass} py-0 pl-3 pr-12`}
              placeholder={t("changePasswordPlaceholder")}
            />
            <Button
              type="button"
              variant="outline"
              disabled={passwordSaving || edit.newPassword.length < 8}
              onClick={onSetPassword}
            >
              {passwordSaving ? t("changingPassword") : t("changePassword")}
            </Button>
            {passwordSuccess && (
              <p className="text-sm text-green-700 dark:text-green-400">
                {t("passwordChanged")}
              </p>
            )}
          </div>
          <div className="space-y-3">
            <p className="text-sm font-semibold">{t("changeEmailTitle")}</p>
            <p className="text-xs text-muted-foreground">{t("changeEmailHint")}</p>
            <input
              type="email"
              autoComplete="off"
              value={edit.newEmail}
              onChange={(e) => onEditChange({ newEmail: e.target.value })}
              className={inputClass}
              placeholder={t("changeEmailPlaceholder")}
            />
            <Button
              type="button"
              variant="outline"
              disabled={
                emailSaving ||
                edit.newEmail.trim().toLowerCase() ===
                  user.email.toLowerCase() ||
                !edit.newEmail.includes("@")
              }
              onClick={onSetEmail}
            >
              {emailSaving ? t("changingEmail") : t("changeEmail")}
            </Button>
            {emailSuccess && (
              <p className="text-sm text-green-700 dark:text-green-400">
                {t("emailChanged")}
              </p>
            )}
            {emailError && (
              <p className="text-sm text-destructive">{emailError}</p>
            )}
          </div>
        </div>
      ),
    },
    {
      id: "notes",
      label: t("manageSectionNotes"),
      content: (
        <label className="block max-w-md space-y-1">
          <span className="text-sm text-muted-foreground">{t("adminNotes")}</span>
          <textarea
            rows={4}
            value={edit.adminNotes}
            onChange={(e) => onEditChange({ adminNotes: e.target.value })}
            className="block w-full rounded-xl border border-border bg-input px-3 py-2 text-base sm:text-sm"
          />
        </label>
      ),
    },
    {
      id: "referral",
      label: t("manageSectionReferral"),
      content: <UserReferralSection userId={user.id} email={user.email} />,
    },
  ];

  return (
    <AdminManageModal
      open={open}
      onClose={onClose}
      title={user.email}
      subtitle={user.name}
      sections={sections}
      footer={
        <Button type="button" className="h-11 w-full sm:w-auto" onClick={onSave}>
          {tc("save")}
        </Button>
      }
    />
  );
}
