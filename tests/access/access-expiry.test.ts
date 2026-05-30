import { describe, expect, it } from "vitest";
import { isAccessExpiryCheckDue } from "@/lib/access/access-expiry-check";
import {
  ACCESS_EXPIRY_CHECK_INTERVALS,
  isAccessExpiryCheckInterval,
} from "@/lib/access/access-expiry-interval";

describe("access expiry scheduling", () => {
  it("validates interval enum strings", () => {
    for (const value of ACCESS_EXPIRY_CHECK_INTERVALS) {
      expect(isAccessExpiryCheckInterval(value)).toBe(true);
    }
    expect(isAccessExpiryCheckInterval("HOURLY")).toBe(false);
  });

  it("isAccessExpiryCheckDue returns false for OFF", () => {
    expect(isAccessExpiryCheckDue("OFF", null)).toBe(false);
  });

  it("isAccessExpiryCheckDue returns true when never run", () => {
    expect(isAccessExpiryCheckDue("DAILY", null)).toBe(true);
  });

  it("isAccessExpiryCheckDue respects interval elapsed time", () => {
    const dayMs = 24 * 60 * 60 * 1000;
    const lastRun = new Date(1_000_000_000_000);
    expect(
      isAccessExpiryCheckDue("DAILY", lastRun, lastRun.getTime() + dayMs),
    ).toBe(true);
    expect(
      isAccessExpiryCheckDue("DAILY", lastRun, lastRun.getTime() + dayMs - 1),
    ).toBe(false);
  });
});
