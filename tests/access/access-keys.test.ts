import { describe, expect, it } from "vitest";
import { AccessKeyKind, type AccessKey } from "@prisma/client";
import {
  generateAccessKeyCode,
  validateAccessKeyRecord,
} from "@/lib/access/access-keys";

function makeKey(overrides: Partial<AccessKey> = {}): AccessKey {
  return {
    id: "key1",
    code: "TESTCODE12",
    label: "Test",
    kind: AccessKeyKind.REFERRAL,
    referrerUserId: "u1",
    active: true,
    maxUses: null,
    usedCount: 0,
    accessDays: 30,
    expiresAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  };
}

describe("access keys", () => {
  it("generateAccessKeyCode produces charset-safe codes", () => {
    const code = generateAccessKeyCode();
    expect(code).toHaveLength(10);
    expect(code).toMatch(/^[A-Z2-9]+$/);
    expect(code).not.toMatch(/[IO01]/);
  });

  it("validateAccessKeyRecord rejects inactive, expired, exhausted keys", () => {
    expect(validateAccessKeyRecord(makeKey())).toBe(true);
    expect(validateAccessKeyRecord(null)).toBe(false);
    expect(validateAccessKeyRecord(makeKey({ active: false }))).toBe(false);
    expect(
      validateAccessKeyRecord(
        makeKey({ expiresAt: new Date(Date.now() - 1000) }),
      ),
    ).toBe(false);
    expect(
      validateAccessKeyRecord(makeKey({ maxUses: 1, usedCount: 1 })),
    ).toBe(false);
    expect(
      validateAccessKeyRecord(makeKey({ kind: AccessKeyKind.REGISTRATION })),
    ).toBe(false);
  });
});
