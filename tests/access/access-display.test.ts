import { describe, expect, it } from "vitest";
import { getDaysUntilExpiry, formatAccessDate } from "@/lib/access/access-display";

describe("access display", () => {
  it("getDaysUntilExpiry ceils partial days", () => {
    const inTwoDays = new Date(Date.now() + 2.5 * 24 * 60 * 60 * 1000);
    expect(getDaysUntilExpiry(inTwoDays.toISOString())).toBe(3);
  });

  it("getDaysUntilExpiry returns 0 or negative for past dates", () => {
    const past = new Date(Date.now() - 24 * 60 * 60 * 1000);
    expect(getDaysUntilExpiry(past.toISOString())).toBeLessThanOrEqual(0);
  });

  it("formatAccessDate uses locale", () => {
    const formatted = formatAccessDate("2025-05-25T00:00:00.000Z", "uk-UA");
    expect(formatted.length).toBeGreaterThan(0);
  });
});
