import { describe, expect, it } from "vitest";
import {
  applyTimeUnit,
  buildTimeServiceCalculation,
  createTimeServiceField,
  isManagedAutoCalculationId,
  isTimeField,
  isTimeServiceCalculationId,
  labelsForTimeUnit,
  quantityTimesDurationTimesRate,
  timeServiceCalculationId,
} from "@/lib/calculator/fields/time-service";

const timeLabels = {
  durationHours: "Hours",
  durationMinutes: "Minutes",
  ratePerHour: "Rate/h",
  ratePerMinute: "Rate/min",
};

describe("time service field (builder)", () => {
  it("createTimeServiceField configures time input", () => {
    const field = createTimeServiceField("field_time", "Consulting", timeLabels);
    expect(isTimeField(field)).toBe(true);
    expect(field.timeUnit).toBe("hour");
    expect(field.properties).toHaveLength(2);
  });

  it("applyTimeUnit switches labels for minute mode", () => {
    const field = createTimeServiceField("field_time", "Work", timeLabels);
    const minutes = applyTimeUnit(field, "minute", timeLabels);
    expect(minutes.timeUnit).toBe("minute");
    expect(minutes.properties[0]?.label).toBe("Minutes");
  });

  it("labelsForTimeUnit returns correct labels", () => {
    expect(labelsForTimeUnit("hour", timeLabels).duration).toBe("Hours");
    expect(labelsForTimeUnit("minute", timeLabels).rate).toBe("Rate/min");
  });

  it("time service auto calculation ids are managed", () => {
    const id = timeServiceCalculationId("field_consult");
    expect(isTimeServiceCalculationId(id)).toBe(true);
    expect(isManagedAutoCalculationId(id)).toBe(true);
    expect(isManagedAutoCalculationId("calculation_manual")).toBe(false);
  });

  it("buildTimeServiceCalculation expression multiplies qty × duration × rate", () => {
    const field = createTimeServiceField("field_time", "Work", timeLabels);
    const calc = buildTimeServiceCalculation(field, "Σ");
    expect(calc.expression.type).toBe("operation");
    const inner = quantityTimesDurationTimesRate("field_time");
    expect(inner.type).toBe("operation");
  });
});
