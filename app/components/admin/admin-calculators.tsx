"use client";

import { CalculatorSharesPanel } from "@/app/components/builder/calculator-shares-panel";
import { useTranslations } from "next-intl";
import { Fragment, useEffect, useState } from "react";
import { Link } from "@/i18n/navigation";
import { AdminErrorAlert } from "@/app/components/admin/admin-error-alert";
import { appFetch } from "@/lib/api/api-client";
import { adminApiErrorMessage } from "@/lib/admin/admin-api-error";

interface CalculatorRow {
  id: string;
  name: string;
  slug: string;
  isPublic: boolean;
  isTemplate: boolean;
  ownerEmail: string | null;
  ownerMissing?: boolean;
}

export function AdminCalculators() {
  const t = useTranslations("admin");
  const tc = useTranslations("common");
  const [calculators, setCalculators] = useState<CalculatorRow[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [transferEmail, setTransferEmail] = useState<Record<string, string>>({});
  const [transferringId, setTransferringId] = useState<string | null>(null);

  async function load() {
    setLoadError(null);
    const response = await appFetch("/api/admin/calculators");
    const data = await response.json();
    if (!response.ok) {
      setLoadError(adminApiErrorMessage(data, t));
      setCalculators([]);
      return;
    }
    setCalculators(data.calculators ?? []);
  }

  useEffect(() => {
    load();
  }, []);

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
    await load();
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
    await load();
  }

  return (
    <div className="space-y-4">
      <AdminErrorAlert message={loadError ?? actionError} />
      <div className="overflow-x-auto rounded-2xl border border-border bg-card/90 shadow-card">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead className="border-b border-border bg-muted/40">
            <tr>
              <th className="px-4 py-3 font-medium">{t("title")}</th>
              <th className="px-4 py-3 font-medium">{t("owner")}</th>
              <th className="px-4 py-3 font-medium">{t("slug")}</th>
              <th className="px-4 py-3 font-medium">{t("flags")}</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {calculators.map((calculator) => (
              <Fragment key={calculator.id}>
                <tr className="border-b border-border/60">
                  <td className="px-4 py-3 font-medium">{calculator.name}</td>
                  <td className="px-4 py-3">
                    {calculator.ownerMissing ? (
                      <span className="text-muted-foreground italic">
                        {t("ownerMissing")}
                      </span>
                    ) : (
                      calculator.ownerEmail
                    )}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs">{calculator.slug}</td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {calculator.isTemplate && `${tc("template")} `}
                    {calculator.isPublic && tc("public")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {!calculator.isTemplate && (
                        <>
                          <Link
                            href={`/builder/${calculator.id}`}
                            className="text-xs font-medium text-accent underline"
                          >
                            {t("editCalculator")}
                          </Link>
                          <button
                            type="button"
                            onClick={() =>
                              setExpandedId((current) =>
                                current === calculator.id ? null : calculator.id,
                              )
                            }
                            className="text-xs font-medium underline"
                          >
                            {expandedId === calculator.id
                              ? t("manageClose")
                              : t("manage")}
                          </button>
                          <button
                            type="button"
                            onClick={() => remove(calculator.id)}
                            className="text-xs font-medium text-destructive underline"
                          >
                            {tc("delete")}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
                {expandedId === calculator.id && !calculator.isTemplate && (
                  <tr key={`${calculator.id}-manage`} className="border-b border-border/60 bg-muted/20">
                    <td colSpan={5} className="px-4 py-4">
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
                            <button
                              type="button"
                              disabled={transferringId === calculator.id}
                              onClick={() => transfer(calculator.id)}
                              className="h-10 rounded-xl bg-accent px-4 text-sm font-medium text-accent-foreground disabled:opacity-50"
                            >
                              {transferringId === calculator.id
                                ? t("transferring")
                                : t("transferBtn")}
                            </button>
                          </div>
                        </div>
                        <CalculatorSharesPanel
                          calculatorId={calculator.id}
                          apiBase="/api/admin/calculators"
                        />
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
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
