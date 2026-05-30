"use client";

import { useTranslations } from "next-intl";
import type { InputField, InputProperty } from "@/types/calculator";
import { slugifyId } from "@/types/calculator";
import { BuilderCollapsible } from "@/app/components/builder/builder-collapsible";
import { NumericInput } from "@/app/components/builder/numeric-input";
import {
  INPUT_SECTION_IDS,
  type InputSectionId,
} from "@/lib/calculator/input-sections";
import {
  isLineItemsField,
  LINE_QTY_ID,
} from "@/lib/calculator/line-items";
import {
  TIME_DURATION_ID,
  TIME_RATE_ID,
  applyTimeUnit,
  ensureTimeProperties,
  isTimeField,
  timeFieldPreview,
  type TimeServiceLabels,
  type TimeUnit,
} from "@/lib/calculator/time-service";

interface InputFieldCardProps {
  field: InputField;
  onChange: (field: InputField) => void;
  onRemove: () => void;
  onDuplicate?: () => void;
  canRemove: boolean;
  defaultOpen?: boolean;
  section?: InputSectionId;
  onSectionChange?: (section: InputSectionId) => void;
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

function timeServiceLabels(t: (key: string) => string): TimeServiceLabels {
  return {
    durationHours: t("timeDurationHours"),
    durationMinutes: t("timeDurationMinutes"),
    ratePerHour: t("timeRatePerHour"),
    ratePerMinute: t("timeRatePerMinute"),
  };
}

function fieldSummary(
  field: InputField,
  t: (key: string, values?: { count: number }) => string,
) {
  if (isTimeField(field)) {
    const parts = [t("fieldSummaryTime")];
    if (field.timeAutoTotal !== false) {
      parts.push(t("fieldSummaryAuto", { count: 1 }));
    }
    return parts.join(" · ");
  }

  if (isLineItemsField(field)) {
    const parts = [
      t("fieldSummaryLineItems"),
      t("fieldSummaryLineColumns", { count: field.properties.length }),
    ];
    const autoCount = field.properties.filter((p) => p.autoTotal).length;
    if (autoCount > 0) {
      parts.push(t("fieldSummaryAuto", { count: autoCount }));
    }
    return parts.join(" · ");
  }

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
  onDuplicate,
  canRemove,
  defaultOpen = false,
  section,
  onSectionChange,
}: InputFieldCardProps) {
  const t = useTranslations("builder");
  const tc = useTranslations("common");
  const labels = timeServiceLabels(t);
  const timeUnit = field.timeUnit ?? "hour";
  const durationProperty = field.properties.find((p) => p.id === TIME_DURATION_ID);
  const rateProperty = field.properties.find((p) => p.id === TIME_RATE_ID);

  function updateProperty(index: number, patch: Partial<InputProperty>) {
    onChange({
      ...field,
      properties: field.properties.map((prop, i) =>
        i === index ? { ...prop, ...patch } : prop,
      ),
    });
  }

  function updateTimeProperty(propertyId: string, patch: Partial<InputProperty>) {
    onChange({
      ...field,
      properties: ensureTimeProperties(field, labels).map((property) =>
        property.id === propertyId ? { ...property, ...patch } : property,
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

  function setTimeUnit(nextUnit: TimeUnit) {
    onChange(applyTimeUnit(field, nextUnit, labels));
  }

  const durationLabel =
    timeUnit === "hour" ? t("timeDurationHours") : t("timeDurationMinutes");
  const rateLabel =
    timeUnit === "hour" ? t("timeRatePerHour") : t("timeRatePerMinute");

  return (
    <BuilderCollapsible
      title={field.label.trim() || t("unnamedField")}
      subtitle={fieldSummary(field, t)}
      defaultOpen={defaultOpen || !field.label.trim()}
      className="bg-muted/20"
      headerActions={
        <div className="flex items-center gap-1">
          {onDuplicate && (
            <button
              type="button"
              onClick={onDuplicate}
              className="rounded-lg px-2 py-1 text-xs text-muted-foreground hover:bg-muted"
            >
              {t("duplicateField")}
            </button>
          )}
          {canRemove && (
            <button
              type="button"
              onClick={onRemove}
              className="rounded-lg px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
            >
              {tc("delete")}
            </button>
          )}
        </div>
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

      {onSectionChange && section && (
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {t("inputSectionLabel")}
          </span>
          <select
            value={section}
            onChange={(e) => onSectionChange(e.target.value as InputSectionId)}
            className="h-10 w-full rounded-xl border border-border bg-input px-3 text-sm"
          >
            {INPUT_SECTION_IDS.map((sectionId) => (
              <option key={sectionId} value={sectionId}>
                {t(`inputSection_${sectionId}`)}
              </option>
            ))}
          </select>
        </label>
      )}

      {isTimeField(field) ? (
        <TimeServiceFields
          timeUnit={timeUnit}
          durationLabel={durationLabel}
          rateLabel={rateLabel}
          duration={durationProperty?.value ?? 1}
          rate={rateProperty?.value ?? 0}
          preview={timeFieldPreview(field, t)}
          timeAutoTotal={field.timeAutoTotal !== false}
          onDurationChange={(value) =>
            updateTimeProperty(TIME_DURATION_ID, { value })
          }
          onRateChange={(value) => updateTimeProperty(TIME_RATE_ID, { value })}
          onTimeUnitChange={setTimeUnit}
          onTimeAutoTotalChange={(checked) =>
            onChange({ ...field, timeAutoTotal: checked })
          }
          t={t}
        />
      ) : isLineItemsField(field) ? (
        <>
          <p className="text-xs text-muted-foreground">{t("lineItemsColumnsHint")}</p>
          <div className="space-y-2">
            {field.properties.map((property, index) => (
              <div
                key={property.id}
                className="space-y-2 rounded-xl border border-border/70 bg-card p-3"
              >
                <VariableInputRow
                  property={property}
                  canRemove={
                    field.properties.length > 1 && property.id !== LINE_QTY_ID
                  }
                  onUpdate={(patch) => updateProperty(index, patch)}
                  onRemove={() =>
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
                  onLabelBlur={(label) => syncPropertyIdFromLabel(index, label)}
                  t={t}
                />
                <label className="flex items-start gap-2 text-xs text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={Boolean(property.autoTotal)}
                    onChange={(e) =>
                      updateProperty(index, { autoTotal: e.target.checked })
                    }
                    className="mt-0.5 size-3.5 accent-accent"
                  />
                  <span>{t("lineItemAutoTotalHint")}</span>
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
            {t("addColumn")}
          </button>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("lineItemDefaultRows")}
              </span>
              <NumericInput
                value={field.lineItemDefaultRowCount ?? 1}
                onChange={(value) =>
                  onChange({ ...field, lineItemDefaultRowCount: Math.max(1, value) })
                }
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
              />
            </label>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium text-muted-foreground">
                {t("lineItemMaxRows")}
              </span>
              <NumericInput
                value={field.lineItemMaxRows ?? 100}
                onChange={(value) =>
                  onChange({ ...field, lineItemMaxRows: Math.max(1, value) })
                }
                className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
              />
            </label>
          </div>
        </>
      ) : (
        <>
          <p className="text-xs text-muted-foreground">{t("inputVariablesHint")}</p>

          <div className="space-y-2">
            {field.properties.map((property, index) => (
              <div
                key={property.id}
                className="space-y-2 rounded-xl border border-border/70 bg-card p-3"
              >
                <VariableInputRow
                  property={property}
                  canRemove={field.properties.length > 1}
                  onUpdate={(patch) => updateProperty(index, patch)}
                  onRemove={() =>
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
                  onLabelBlur={(label) => syncPropertyIdFromLabel(index, label)}
                  t={t}
                />
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
        </>
      )}

      {!isLineItemsField(field) && (
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {isTimeField(field) ? t("timeDefaultQuantity") : t("defaultQuantity")}
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
      )}
    </BuilderCollapsible>
  );
}

function TimeServiceFields({
  timeUnit,
  durationLabel,
  rateLabel,
  duration,
  rate,
  preview,
  timeAutoTotal,
  onDurationChange,
  onRateChange,
  onTimeUnitChange,
  onTimeAutoTotalChange,
  t,
}: {
  timeUnit: TimeUnit;
  durationLabel: string;
  rateLabel: string;
  duration: number;
  rate: number;
  preview: string;
  timeAutoTotal: boolean;
  onDurationChange: (value: number) => void;
  onRateChange: (value: number) => void;
  onTimeUnitChange: (unit: TimeUnit) => void;
  onTimeAutoTotalChange: (checked: boolean) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div className="space-y-3 rounded-xl border border-border/70 bg-card p-3">
      <TimeUnitToggle
        timeUnit={timeUnit}
        onTimeUnitChange={onTimeUnitChange}
        t={t}
      />

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {durationLabel}
          </span>
          <NumericInput
            value={duration}
            onChange={onDurationChange}
            className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
          />
        </label>
        <label className="block space-y-1.5">
          <span className="text-xs font-medium text-muted-foreground">
            {rateLabel}
          </span>
          <NumericInput
            value={rate}
            onChange={onRateChange}
            className="h-10 w-full rounded-lg border border-border bg-input px-3 text-sm"
          />
        </label>
      </div>

      <p className="rounded-lg bg-muted/60 px-3 py-2 text-xs text-muted-foreground">
        {t("timeFormulaPreview", { preview })}
      </p>

      <label className="flex items-start gap-2 text-xs text-muted-foreground">
        <input
          type="checkbox"
          checked={timeAutoTotal}
          onChange={(e) => onTimeAutoTotalChange(e.target.checked)}
          className="mt-0.5 size-3.5 accent-accent"
        />
        <span>{t("timeAutoTotalHint")}</span>
      </label>
    </div>
  );
}

function TimeUnitToggle({
  timeUnit,
  onTimeUnitChange,
  t,
}: {
  timeUnit: TimeUnit;
  onTimeUnitChange: (unit: TimeUnit) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div className="space-y-1.5">
      <span className="text-xs font-medium text-muted-foreground">
        {t("timeUnitLabel")}
      </span>
      <div className="flex flex-wrap gap-2">
        {(["hour", "minute"] as const).map((unit) => (
          <button
            key={unit}
            type="button"
            onClick={() => onTimeUnitChange(unit)}
            className={`rounded-full border px-3 py-1.5 text-sm transition ${
              timeUnit === unit
                ? "border-accent bg-accent-muted font-medium text-accent-foreground"
                : "border-border bg-card hover:border-accent/60"
            }`}
          >
            {unit === "hour" ? t("timeUnitHour") : t("timeUnitMinute")}
          </button>
        ))}
      </div>
    </div>
  );
}

function VariableInputRow({
  property,
  canRemove,
  onUpdate,
  onRemove,
  onLabelBlur,
  t,
}: {
  property: InputProperty;
  canRemove: boolean;
  onUpdate: (patch: Partial<InputProperty>) => void;
  onRemove: () => void;
  onLabelBlur: (label: string) => void;
  t: (key: string, values?: Record<string, string | number>) => string;
}) {
  return (
    <div className="grid gap-2 sm:grid-cols-[1fr_100px_auto]">
      <input
        value={property.label}
        onChange={(e) => onUpdate({ label: e.target.value })}
        onBlur={(e) => onLabelBlur(e.target.value)}
        placeholder={t("variableNamePlaceholder")}
        className="h-10 rounded-lg border border-border bg-input px-3 text-sm"
      />
      <NumericInput
        value={property.value}
        onChange={(value) => onUpdate({ value })}
        className="h-10 rounded-lg border border-border bg-input px-3 text-sm"
      />
      {canRemove && (
        <button
          type="button"
          onClick={onRemove}
          className="h-10 text-xs text-destructive sm:px-2"
        >
          ×
        </button>
      )}
    </div>
  );
}
