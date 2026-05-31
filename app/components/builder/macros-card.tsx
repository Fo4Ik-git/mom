"use client";

import { useTranslations } from "next-intl";
import type { FormulaMacro } from "@/types/calculator";
import { slugifyId } from "@/types/calculator";
import { FormulaBuilder } from "@/app/components/builder/formula-builder";

interface MacrosCardProps {
  macro: FormulaMacro;
  config: import("@/types/calculator").CalculatorConfig;
  canRemove: boolean;
  onChange: (macro: FormulaMacro) => void;
  onRemove: () => void;
}

export function MacrosCard({
  macro,
  config,
  canRemove,
  onChange,
  onRemove,
}: MacrosCardProps) {
  const t = useTranslations("builder");
  const tc = useTranslations("common");

  return (
    <div className="space-y-3 rounded-xl border border-border bg-card/80 p-3">
      <div className="flex flex-wrap items-end gap-3">
        <label className="min-w-[120px] flex-1 space-y-1">
          <span className="text-xs text-muted-foreground">{t("macroName")}</span>
          <input
            value={macro.label}
            onChange={(e) => onChange({ ...macro, label: e.target.value })}
            onBlur={(e) => {
              const label = e.target.value.trim();
              if (label) {
                onChange({ ...macro, label, id: slugifyId(label, "macro") });
              }
            }}
            placeholder={t("macroNamePlaceholder")}
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
      <FormulaBuilder
        config={config}
        formulaTarget={{ fieldId: macro.id }}
        fieldKey={macro.id}
        fieldLabel={macro.label.trim() || macro.id}
        expression={macro.expression}
        onChange={(expression) => onChange({ ...macro, expression })}
      />
    </div>
  );
}
