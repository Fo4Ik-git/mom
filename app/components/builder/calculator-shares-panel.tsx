"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import {
  AdminUserSelect,
  type UserOption,
} from "@/app/components/admin/admin-user-select";
import { Button } from "@/app/components/ui/button";
import { appFetch } from "@/lib/api/api-client";

type ShareRow = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: "VIEW" | "EDIT";
};

interface CalculatorSharesPanelProps {
  calculatorId: string;
  apiBase?: string;
}

export function CalculatorSharesPanel({
  calculatorId,
  apiBase = "/api/calculators",
}: CalculatorSharesPanelProps) {
  const t = useTranslations("sharing");
  const isAdminApi = apiBase.includes("/api/admin/");
  const [shares, setShares] = useState<ShareRow[]>([]);
  const [email, setEmail] = useState("");
  const [pickUserId, setPickUserId] = useState("");
  const [pickUserEmail, setPickUserEmail] = useState("");
  const [role, setRole] = useState<"VIEW" | "EDIT">("EDIT");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const res = await appFetch(`${apiBase}/${calculatorId}/shares`);
    const data = await res.json();
    if (!res.ok) {
      setError(t("loadFailed"));
      setShares([]);
      setLoading(false);
      return;
    }
    setShares(data.shares ?? []);
    setLoading(false);
  }, [apiBase, calculatorId, t]);

  useEffect(() => {
    load();
  }, [load]);

  async function addShare(event: React.FormEvent) {
    event.preventDefault();
    const shareEmail = isAdminApi ? pickUserEmail.trim() : email.trim();
    if (!shareEmail) {
      return;
    }
    setSaving(true);
    setError(null);
    const res = await appFetch(`${apiBase}/${calculatorId}/shares`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: shareEmail, role }),
    });
    const data = await res.json();
    setSaving(false);
    if (!res.ok) {
      setError(shareErrorMessage(data.error, t));
      return;
    }
    setEmail("");
    setPickUserId("");
    setPickUserEmail("");
    await load();
  }

  function onPickUser(userId: string, user: UserOption | null) {
    setPickUserId(userId);
    setPickUserEmail(user?.email ?? "");
  }

  const inputClass =
    "block h-10 w-full rounded-xl border border-border bg-input px-3 text-sm";

  async function removeShare(userId: string) {
    if (!confirm(t("removeConfirm"))) {
      return;
    }
    setError(null);
    const res = await appFetch(
      `${apiBase}/${calculatorId}/shares/${userId}`,
      { method: "DELETE" },
    );
    if (!res.ok) {
      setError(t("removeFailed"));
      return;
    }
    await load();
  }

  return (
    <div className="space-y-3 border-t border-border/70 pt-3">
      <p className="text-sm font-medium">{t("title")}</p>
      <p className="text-xs text-muted-foreground">{t("hint")}</p>

      {error && (
        <p className="text-xs text-destructive">{error}</p>
      )}

      <form
        onSubmit={addShare}
        className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
      >
        {isAdminApi ? (
          <label className="space-y-1 sm:col-span-2 lg:col-span-3">
            <span className="text-sm text-muted-foreground">{t("pickUser")}</span>
            <AdminUserSelect
              value={pickUserId}
              onChange={onPickUser}
              disabled={saving}
              placeholder={t("pickUserPlaceholder")}
              emptyLabel={t("pickUserEmpty")}
            />
          </label>
        ) : (
          <label className="space-y-1 sm:col-span-2 lg:col-span-3">
            <span className="text-sm text-muted-foreground">{t("email")}</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className={inputClass}
              placeholder={t("emailPlaceholder")}
            />
          </label>
        )}
        <label className="space-y-1">
          <span className="text-sm text-muted-foreground">{t("role")}</span>
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as "VIEW" | "EDIT")}
            className={inputClass}
          >
            <option value="EDIT">{t("roleEdit")}</option>
            <option value="VIEW">{t("roleView")}</option>
          </select>
        </label>
        <div className="flex items-end">
          <Button type="submit" disabled={saving || (isAdminApi && !pickUserId)}>
            {saving ? t("adding") : t("add")}
          </Button>
        </div>
      </form>

      {loading ? (
        <p className="text-xs text-muted-foreground">{t("loading")}</p>
      ) : shares.length === 0 ? (
        <p className="text-xs text-muted-foreground">{t("empty")}</p>
      ) : (
        <ul className="space-y-2">
          {shares.map((share) => (
            <li
              key={share.id}
              className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-border/60 px-3 py-2 text-sm"
            >
              <span>
                {share.email}
                <span className="ml-2 text-xs text-muted-foreground">
                  {share.role === "EDIT" ? t("roleEdit") : t("roleView")}
                </span>
              </span>
              <button
                type="button"
                onClick={() => removeShare(share.userId)}
                className="text-xs text-destructive underline"
              >
                {t("remove")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function shareErrorMessage(
  code: string | undefined,
  t: (key: string) => string,
): string {
  switch (code) {
    case "user_not_found":
      return t("userNotFound");
    case "cannot_share_with_owner":
      return t("cannotShareOwner");
    default:
      return t("addFailed");
  }
}
