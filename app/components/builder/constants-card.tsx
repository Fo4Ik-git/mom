"use client";

import { useTranslations } from "next-intl";
import type { CalculatorConstant } from "@/types/calculator";
import { slugifyId } from "@/types/calculator";
import { NumericInput } from "@/app/components/builder/numeric-input";

interface ConstantsCardProps {
  constant: CalculatorConstant;
  canRemove: boolean;
  onChange: (constant: CalculatorConstant) => void;
  onRemove: () => void;
}

export function ConstantsCard({
  constant,
  canRemove,
  onChange,
  onRemove,
}: ConstantsCardProps) {
  const t = useTranslations("builder");
  const tc = useTranslations("common");

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-xl border border-border bg-card/80 p-3">
      <label className="min-w-[120px] flex-1 space-y-1">
        <span className="text-xs text-muted-foreground">{t("constantName")}</span>
        <input
          value={constant.label}
          onChange={(e) => onChange({ ...constant, label: e.target.value })}
          onBlur={(e) => {
            const label = e.target.value.trim();
            if (label) {
              onChange({ ...constant, label, id: slugifyId(label, "const") });
            }
          }}
          placeholder={t("constantNamePlaceholder")}
          className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
        />
      </label>
      <label className="w-28 space-y-1">
        <span className="text-xs text-muted-foreground">{t("constantValue")}</span>
        <NumericInput
          value={constant.value}
          onChange={(value) => onChange({ ...constant, value })}
          className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
        />
      </label>
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="mb-1 text-xs text-destructive underline"
        >
          {tc("delete")}
        </button>
      )}
    </div>
  );
}
