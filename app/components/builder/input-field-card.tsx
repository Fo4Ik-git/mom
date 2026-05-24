"use client";

import { useTranslations } from "next-intl";
import type { InputField, InputProperty } from "@/types/calculator";
import { slugifyId } from "@/types/calculator";
import { BuilderCollapsible } from "@/app/components/builder/builder-collapsible";
import { NumericInput } from "@/app/components/builder/numeric-input";

interface InputFieldCardProps {
  field: InputField;
  onChange: (field: InputField) => void;
  onRemove: () => void;
  canRemove: boolean;
  defaultOpen?: boolean;
}

function randomPropId() {
  return `var_${Math.random().toString(36).slice(2, 6)}`;
}

function parsePresets(raw: string): number[] | undefined {
  const values = raw
    .split(/[,;\s]+/)
    .map((part) => Number(part.trim()))
    .filter((value) => Number.isFinite(value));
  return values.length > 0 ? values : undefined;
}

function formatPresets(presets?: number[]) {
  return presets?.join(", ") ?? "";
}

function fieldSummary(
  field: InputField,
  t: (key: string, values?: { count: number }) => string,
) {
  const parts: string[] = [t("fieldSummaryVars", { count: field.properties.length })];
  const autoCount = field.properties.filter((p) => p.autoTotal).length;
  if (autoCount > 0) {
    parts.push(t("fieldSummaryAuto", { count: autoCount }));
  }
  if (field.presets?.length) {
    parts.push(t("fieldSummaryPresets", { count: field.presets.length }));
  }
  return parts.join(" · ");
}

export function InputFieldCard({
  field,
  onChange,
  onRemove,
  canRemove,
  defaultOpen = false,
}: InputFieldCardProps) {
  const t = useTranslations("builder");
  const tc = useTranslations("common");

  function updateProperty(index: number, patch: Partial<InputProperty>) {
    onChange({
      ...field,
      properties: field.properties.map((prop, i) =>
        i === index ? { ...prop, ...patch } : prop,
      ),
    });
  }

  function syncFieldIdFromLabel(label: string) {
    if (!label.trim()) {
      return;
    }
    onChange({ ...field, label, id: slugifyId(label, "field") });
  }

  function syncPropertyIdFromLabel(index: number, label: string) {
    if (!label.trim()) {
      return;
    }
    updateProperty(index, { label, id: slugifyId(label, "var") });
  }

  return (
    <BuilderCollapsible
      title={field.label.trim() || t("unnamedField")}
      subtitle={fieldSummary(field, t)}
      defaultOpen={defaultOpen || !field.label.trim()}
      className="bg-muted/20"
      headerActions={
        canRemove ? (
          <button
            type="button"
            onClick={onRemove}
            className="rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
          >
            {tc("delete")}
          </button>
        ) : undefined
      }
    >
      <label className="block space-y-1.5">
        <span className="text-xs font-medium text-muted-foreground">
          {t("inputFieldName")}
        </span>
        <input
          value={field.label}
          onChange={(e) => onChange({ ...field, label: e.target.value })}
          onBlur={(e) => syncFieldIdFromLabel(e.target.value)}
          placeholder={t("inputFieldNamePlaceholder")}
          className="h-11 w-full rounded-xl border border-border bg-input px-3.5 text-sm font-medium"
        />
      </label>

      <p className="text-xs text-muted-foreground">{t("inputVariablesHint")}</p>

      <div className="space-y-2">
        {field.properties.map((property, index) => (
          <div
            key={property.id}
            className="space-y-2 rounded-xl border border-border/70 bg-card p-3"
          >
            <div className="grid gap-2 sm:grid-cols-[1fr_100px_auto]">
              <input
                value={property.label}
                onChange={(e) => updateProperty(index, { label: e.target.value })}
                onBlur={(e) => syncPropertyIdFromLabel(index, e.target.value)}
                placeholder={t("variableNamePlaceholder")}
                className="h-10 rounded-lg border border-border bg-input px-3 text-sm"
              />
              <NumericInput
                value={property.value}
                onChange={(value) => updateProperty(index, { value })}
                className="h-10 rounded-lg border border-border bg-input px-3 text-sm"
              />
              {field.properties.length > 1 && (
                <button
                  type="button"
                  onClick={() =>
                    onChange({
                      ...field,
                      properties: field.properties
                        .filter((_, i) => i !== index)
                        .map((prop) =>
                          prop.id === property.id
                            ? { ...prop, autoTotal: false }
                            : prop,
                        ),
                    })
                  }
                  className="h-10 text-xs text-destructive sm:px-2"
                >
                  ×
                </button>
              )}
            </div>
            <label className="flex items-start gap-2 text-xs text-muted-foreground">
              <input
                type="checkbox"
                checked={Boolean(property.autoTotal)}
                onChange={(e) =>
                  updateProperty(index, { autoTotal: e.target.checked })
                }
                className="mt-0.5 size-3.5 accent-accent"
              />
              <span>{t("autoTotalHint")}</span>
            </label>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() =>
          onChange({
            ...field,
            properties: [
              ...field.properties,
              { id: randomPropId(), label: t("newVariable"), value: 0 },
            ],
          })
        }
        className="text-sm font-medium text-accent"
      >
        {t("addVariable")}
      </button>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {t("defaultQuantity")}
          </span>
          <NumericInput
            value={field.defaultQuantity ?? 0}
            onChange={(value) => onChange({ ...field, defaultQuantity: value })}
            className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {t("quantityPresets")}
          </span>
          <input
            value={formatPresets(field.presets)}
            onChange={(e) =>
              onChange({ ...field, presets: parsePresets(e.target.value) })
            }
            placeholder={t("quantityPresetsPlaceholder")}
            className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
          />
        </label>
      </div>
    </BuilderCollapsible>
  );
}
