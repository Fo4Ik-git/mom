import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import { isAccessActive } from "@/lib/access/user-limits";
import { shouldBlockUser } from "@/lib/access/account-status";
import { banReasonI18nKey, isBanReason } from "@/lib/access/ban-reasons";
import { BanReason } from "@prisma/client";

describe("user access rules", () => {
  it("isAccessActive treats ADMIN as always active", () => {
    expect(
      isAccessActive({
        role: Role.ADMIN,
        accessExpiresAt: new Date("2020-01-01"),
      }),
    ).toBe(true);
  });

  it("isAccessActive checks calendar-day expiry for USER", () => {
    const future = new Date();
    future.setDate(future.getDate() + 10);
    expect(
      isAccessActive({ role: Role.USER, accessExpiresAt: future }),
    ).toBe(true);

    const past = new Date("2020-01-01");
    expect(
      isAccessActive({ role: Role.USER, accessExpiresAt: past }),
    ).toBe(false);
  });

  it("isAccessActive allows USER without expiry date", () => {
    expect(
      isAccessActive({ role: Role.USER, accessExpiresAt: null }),
    ).toBe(true);
  });

  it("shouldBlockUser blocks banned non-admin users", () => {
    expect(shouldBlockUser({ role: Role.USER, banned: true })).toBe(true);
    expect(shouldBlockUser({ role: Role.ADMIN, banned: true })).toBe(false);
    expect(shouldBlockUser({ role: Role.USER, banned: false })).toBe(false);
  });

  it("ban reason helpers", () => {
    expect(isBanReason(BanReason.ACCESS_EXPIRED)).toBe(true);
    expect(isBanReason("UNKNOWN")).toBe(false);
    expect(banReasonI18nKey(BanReason.ACCESS_EXPIRED)).toBe(
      "banReason_ACCESS_EXPIRED",
    );
  });
});
