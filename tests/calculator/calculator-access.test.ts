import { describe, expect, it } from "vitest";
import {
  accessKindToResponse,
  canDeleteCalculator,
  canEditCalculator,
  canManageShares,
  canTransferOwnership,
} from "@/lib/calculator/access";
import type { Calculator } from "@prisma/client";

const calculator = {
  id: "calc-1",
  userId: "owner-1",
  name: "Test",
  description: null,
  slug: "test",
  config: "{}",
  isPublic: false,
  isTemplate: false,
  createdAt: new Date(),
  updatedAt: new Date(),
} satisfies Calculator;

describe("calculator access helpers", () => {
  it("owner can edit, share, and delete", () => {
    const access = { calculator, kind: "owner" as const, shareRole: null };
    expect(canEditCalculator(access)).toBe(true);
    expect(canManageShares(access)).toBe(true);
    expect(canDeleteCalculator(access)).toBe(true);
    expect(canTransferOwnership(access)).toBe(false);
    expect(accessKindToResponse("owner").isOwner).toBe(true);
  });

  it("admin can edit, share, delete, transfer", () => {
    const access = { calculator, kind: "admin" as const, shareRole: null };
    expect(canEditCalculator(access)).toBe(true);
    expect(canManageShares(access)).toBe(true);
    expect(canDeleteCalculator(access)).toBe(true);
    expect(canTransferOwnership(access)).toBe(true);
  });

  it("shared edit can edit but not manage shares", () => {
    const access = { calculator, kind: "edit" as const, shareRole: "EDIT" as const };
    expect(canEditCalculator(access)).toBe(true);
    expect(canManageShares(access)).toBe(false);
    expect(canDeleteCalculator(access)).toBe(false);
  });

  it("shared view is read-only", () => {
    const access = { calculator, kind: "view" as const, shareRole: "VIEW" as const };
    expect(canEditCalculator(access)).toBe(false);
    expect(canManageShares(access)).toBe(false);
  });
});
