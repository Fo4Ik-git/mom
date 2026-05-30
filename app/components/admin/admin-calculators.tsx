"use client";

import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";
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
              <tr key={calculator.id} className="border-b border-border/60">
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
                  {!calculator.isTemplate && (
                    <button
                      type="button"
                      onClick={() => remove(calculator.id)}
                      className="text-xs font-medium text-destructive underline"
                    >
                      {tc("delete")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
