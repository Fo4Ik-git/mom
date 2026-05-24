"use client";

import { useTranslations } from "next-intl";
import type { InputField, InputProperty } from "@/types/calculator";
import { slugifyId } from "@/types/calculator";
import { NumericInput } from "@/app/components/builder/numeric-input";

interface InputFieldCardProps {
  field: InputField;
  onChange: (field: InputField) => void;
  onRemove: () => void;
  canRemove: boolean;
}

function randomPropId() {
  return `var_${Math.random().toString(36).slice(2, 6)}`;
}

export function InputFieldCard({
  field,
  onChange,
  onRemove,
  canRemove,
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
    <div className="space-y-3 rounded-2xl border border-border bg-muted/20 p-4">
      <div className="flex items-start justify-between gap-2">
        <label className="block flex-1 space-y-1.5">
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
        {canRemove && (
          <button
            type="button"
            onClick={onRemove}
            className="mt-6 shrink-0 text-xs text-destructive underline"
          >
            {tc("delete")}
          </button>
        )}
      </div>

      <p className="text-xs text-muted-foreground">{t("inputVariablesHint")}</p>

      <div className="space-y-2">
        {field.properties.map((property, index) => (
          <div
            key={property.id}
            className="grid gap-2 rounded-xl border border-border/70 bg-card p-3 sm:grid-cols-[1fr_100px_auto]"
          >
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
                    properties: field.properties.filter((_, i) => i !== index),
                  })
                }
                className="h-10 text-xs text-destructive sm:px-2"
              >
                ×
              </button>
            )}
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
    </div>
  );
}
