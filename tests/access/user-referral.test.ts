import { describe, expect, it } from "vitest";
import { AccessKeyKind, type AccessKey } from "@prisma/client";
import {
  isReferralKeyDisplayable,
  toReferralKeyDto,
} from "@/lib/access/referral-key-display";

function makeKey(overrides: Partial<AccessKey> = {}): AccessKey {
  return {
    id: "k1",
    code: "REFCODE12",
    kind: AccessKeyKind.REFERRAL,
    label: null,
    maxUses: 5,
    usedCount: 2,
    expiresAt: null,
    accessDays: null,
    active: true,
    referrerUserId: "u1",
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("referral-key-display", () => {
  it("isReferralKeyDisplayable rejects inactive and exhausted keys", () => {
    expect(isReferralKeyDisplayable(makeKey())).toBe(true);
    expect(isReferralKeyDisplayable(makeKey({ active: false }))).toBe(false);
    expect(
      isReferralKeyDisplayable(makeKey({ maxUses: 2, usedCount: 2 })),
    ).toBe(false);
  });

  it("toReferralKeyDto sets displayable flag", () => {
    const dto = toReferralKeyDto(makeKey({ active: false }));
    expect(dto.displayable).toBe(false);
    expect(dto.code).toBe("REFCODE12");
  });
});
