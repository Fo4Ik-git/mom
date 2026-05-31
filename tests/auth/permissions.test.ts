import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import {
  assertCanGrantAiAccess,
  assertCanManageUser,
  canAccessAdminPanel,
  canGrantAiAccess,
  canManageUser,
} from "@/lib/auth/permissions";

describe("permissions", () => {
  it("USER cannot access admin panel", () => {
    expect(canAccessAdminPanel(Role.USER)).toBe(false);
  });

  it("ADMIN can access admin panel but not manage other admins", () => {
    expect(canAccessAdminPanel(Role.ADMIN)).toBe(true);
    expect(canManageUser(Role.ADMIN, Role.USER)).toBe(true);
    expect(canManageUser(Role.ADMIN, Role.ADMIN)).toBe(false);
    expect(canManageUser(Role.ADMIN, Role.SUPERADMIN)).toBe(false);
    expect(
      canManageUser(Role.ADMIN, Role.ADMIN, "admin-1", "admin-1"),
    ).toBe(true);
    expect(assertCanManageUser(Role.ADMIN, Role.ADMIN, "a", "b")).toBe(
      "cannot_modify_elevated_user",
    );
  });

  it("ADMIN cannot grant AI access", () => {
    expect(canGrantAiAccess(Role.ADMIN)).toBe(false);
    expect(assertCanGrantAiAccess(Role.ADMIN)).toBe("forbidden_ai_access");
  });

  it("SUPERADMIN has full user and AI permissions", () => {
    expect(canManageUser(Role.SUPERADMIN, Role.ADMIN)).toBe(true);
    expect(canManageUser(Role.SUPERADMIN, Role.SUPERADMIN)).toBe(true);
    expect(canGrantAiAccess(Role.SUPERADMIN)).toBe(true);
  });
});
