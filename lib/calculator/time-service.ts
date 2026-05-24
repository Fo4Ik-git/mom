import type {
  BlockExpression,
  CalculationField,
  InputField,
  InputProperty,
} from "@/types/calculator";
import { operationExpression, operandExpression, quantityTimesProperty } from "@/lib/formula/expression-builders";

export type TimeUnit = "hour" | "minute";

export const TIME_DURATION_ID = "var_duration";
export const TIME_RATE_ID = "var_rate";

export interface TimeServiceLabels {
  durationHours: string;
  durationMinutes: string;
  ratePerHour: string;
  ratePerMinute: string;
}

export function isTimeField(field: InputField) {
  return field.inputMode === "time";
}

export function timeServiceCalculationId(fieldId: string) {
  return `calc_${fieldId}_time`.slice(0, 48);
}

export function isTimeServiceCalculationId(id: string) {
  return /^calc_field_[a-z0-9_]+_time$/.test(id);
}

export function isManagedAutoCalculationId(id: string) {
  return /^calc_field_[a-z0-9_]+_(time|[a-z][a-z0-9_]*)$/.test(id);
}

export function labelsForTimeUnit(
  unit: TimeUnit,
  labels: TimeServiceLabels,
): { duration: string; rate: string } {
  return unit === "hour"
    ? { duration: labels.durationHours, rate: labels.ratePerHour }
    : { duration: labels.durationMinutes, rate: labels.ratePerMinute };
}

export function unitShortLabel(unit: TimeUnit, t: (key: string) => string) {
  return unit === "hour" ? t("timeUnitHourShort") : t("timeUnitMinuteShort");
}

export function ensureTimeProperties(
  field: InputField,
  labels: TimeServiceLabels,
): InputProperty[] {
  const unit = field.timeUnit ?? "hour";
  const { duration, rate } = labelsForTimeUnit(unit, labels);
  const existingDuration = field.properties.find((p) => p.id === TIME_DURATION_ID);
  const existingRate = field.properties.find((p) => p.id === TIME_RATE_ID);

  return [
    {
      id: TIME_DURATION_ID,
      label: duration,
      value: existingDuration?.value ?? 1,
    },
    {
      id: TIME_RATE_ID,
      label: rate,
      value: existingRate?.value ?? 0,
    },
  ];
}

export function createTimeServiceField(
  fieldId: string,
  label: string,
  labels: TimeServiceLabels,
  options?: {
    timeUnit?: TimeUnit;
    duration?: number;
    rate?: number;
    defaultQuantity?: number;
  },
): InputField {
  const timeUnit = options?.timeUnit ?? "hour";
  const { duration, rate } = labelsForTimeUnit(timeUnit, labels);

  return {
    id: fieldId,
    label,
    inputMode: "time",
    timeUnit,
    timeAutoTotal: true,
    properties: [
      { id: TIME_DURATION_ID, label: duration, value: options?.duration ?? 1 },
      { id: TIME_RATE_ID, label: rate, value: options?.rate ?? 500 },
    ],
    defaultQuantity: options?.defaultQuantity ?? 1,
  };
}

export function applyTimeUnit(
  field: InputField,
  unit: TimeUnit,
  labels: TimeServiceLabels,
): InputField {
  const { duration, rate } = labelsForTimeUnit(unit, labels);
  return {
    ...field,
    inputMode: "time",
    timeUnit: unit,
    properties: ensureTimeProperties(field, labels).map((prop) => {
      if (prop.id === TIME_DURATION_ID) {
        return { ...prop, label: duration };
      }
      if (prop.id === TIME_RATE_ID) {
        return { ...prop, label: rate };
      }
      return prop;
    }),
  };
}

export function quantityTimesDurationTimesRate(fieldId: string): BlockExpression {
  return operationExpression(
    "*",
    quantityTimesProperty(fieldId, TIME_DURATION_ID),
    operandExpression({
      kind: "property",
      fieldId,
      propertyId: TIME_RATE_ID,
    }),
  );
}

export function timeServiceCalculationLabel(fieldLabel: string, totalLabel: string) {
  const base = fieldLabel.trim() || "…";
  return `${base} · ${totalLabel}`;
}

export function buildTimeServiceCalculation(
  field: InputField,
  totalLabel: string,
): CalculationField {
  return {
    id: timeServiceCalculationId(field.id),
    label: timeServiceCalculationLabel(field.label, totalLabel),
    expression: quantityTimesDurationTimesRate(field.id),
  };
}

export function timeFieldPreview(
  field: InputField,
  t: (key: string) => string,
): string {
  const unit = field.timeUnit ?? "hour";
  const duration =
    field.properties.find((p) => p.id === TIME_DURATION_ID)?.value ?? 0;
  const rate = field.properties.find((p) => p.id === TIME_RATE_ID)?.value ?? 0;
  const unitLabel = unitShortLabel(unit, t);
  return `${duration} ${unitLabel} × ${rate}`;
}
