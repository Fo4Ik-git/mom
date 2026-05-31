import { describe, expect, it } from "vitest";
import {
  getQuotaPeriodEnd,
  getQuotaPeriodStart,
} from "@/lib/ai/ai-quota-period";

describe("ai quota period", () => {
  it("day period is same calendar day UTC", () => {
    const now = new Date("2026-05-30T15:00:00.000Z");
    const start = getQuotaPeriodStart("DAY", now);
    expect(start.toISOString()).toBe("2026-05-30T00:00:00.000Z");
    const end = getQuotaPeriodEnd("DAY", start);
    expect(end.toISOString()).toBe("2026-05-31T00:00:00.000Z");
  });

  it("week period starts on Monday UTC", () => {
    const now = new Date("2026-05-30T15:00:00.000Z");
    const start = getQuotaPeriodStart("WEEK", now);
    expect(start.toISOString()).toBe("2026-05-25T00:00:00.000Z");
  });

  it("month period starts on first day UTC", () => {
    const now = new Date("2026-05-30T15:00:00.000Z");
    const start = getQuotaPeriodStart("MONTH", now);
    expect(start.toISOString()).toBe("2026-05-01T00:00:00.000Z");
    const end = getQuotaPeriodEnd("MONTH", start);
    expect(end.toISOString()).toBe("2026-06-01T00:00:00.000Z");
  });
});
