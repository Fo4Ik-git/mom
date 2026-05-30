import { describe, expect, it } from "vitest";
import {
  extendAccessExpiresAt,
  resolveReferrerBonusDays,
} from "@/lib/access/referrer-bonus";

describe("extendAccessExpiresAt", () => {
  const now = new Date("2026-05-30T12:00:00Z");

  it("returns null for unlimited access", () => {
    expect(extendAccessExpiresAt(null, 7, now)).toBeNull();
  });

  it("returns unchanged when bonus is zero", () => {
    const exp = new Date("2026-06-01T00:00:00Z");
    expect(extendAccessExpiresAt(exp, 0, now)).toEqual(exp);
  });

  it("extends from now when access already expired", () => {
    const exp = new Date("2026-01-01T00:00:00Z");
    const next = extendAccessExpiresAt(exp, 10, now)!;
    expect(next.getTime()).toBe(
      new Date("2026-06-09T12:00:00Z").getTime(),
    );
  });

  it("extends from current expiry when still active", () => {
    const exp = new Date("2026-07-01T00:00:00Z");
    const next = extendAccessExpiresAt(exp, 5, now)!;
    expect(next.getTime()).toBe(
      new Date("2026-07-06T00:00:00Z").getTime(),
    );
  });
});

describe("resolveReferrerBonusDays", () => {
  it("uses key override when set", () => {
    expect(resolveReferrerBonusDays({ referrerBonusDays: 14 }, 7)).toBe(14);
  });

  it("allows zero override to disable bonus", () => {
    expect(resolveReferrerBonusDays({ referrerBonusDays: 0 }, 7)).toBe(0);
  });

  it("falls back to platform default", () => {
    expect(resolveReferrerBonusDays({ referrerBonusDays: null }, 7)).toBe(7);
  });
});
