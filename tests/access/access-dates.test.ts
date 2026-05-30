import { describe, expect, it } from "vitest";
import {
  accessExpiresAtFromDateInput,
  formatDateInputLocal,
  isAccessExpiredByCalendarDay,
  toLocalDateKey,
} from "@/lib/access/access-dates";

describe("access dates", () => {
  it("toLocalDateKey formats local calendar date", () => {
    const date = new Date(2025, 4, 25, 15, 30);
    expect(toLocalDateKey(date)).toBe("2025-05-25");
  });

  it("isAccessExpiredByCalendarDay is valid through expiry day", () => {
    const expiry = new Date(2025, 4, 25, 23, 59);
    const sameDay = new Date(2025, 4, 25, 8, 0);
    const nextDay = new Date(2025, 4, 26, 0, 1);
    expect(isAccessExpiredByCalendarDay(expiry, sameDay)).toBe(false);
    expect(isAccessExpiredByCalendarDay(expiry, nextDay)).toBe(true);
  });

  it("formatDateInputLocal handles invalid ISO", () => {
    expect(formatDateInputLocal(null)).toBe("");
    expect(formatDateInputLocal("not-a-date")).toBe("");
    expect(formatDateInputLocal("2025-05-25T10:00:00.000Z")).toMatch(
      /^\d{4}-\d{2}-\d{2}$/,
    );
  });

  it("accessExpiresAtFromDateInput saves end of local day", () => {
    const iso = accessExpiresAtFromDateInput("2025-05-25");
    expect(new Date(iso).getHours()).toBe(23);
    expect(new Date(iso).getMinutes()).toBe(59);
  });
});
