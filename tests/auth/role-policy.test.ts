import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import {
  canManageStaffRoles,
  hasStaffPlatformPrivileges,
  isStaffRole,
  isSuperAdminRole,
} from "@/lib/auth/permissions";

describe("staff-role", () => {
  it("treats SUPERADMIN as staff with full platform privileges", () => {
    expect(isStaffRole(Role.SUPERADMIN)).toBe(true);
    expect(isSuperAdminRole(Role.SUPERADMIN)).toBe(true);
    expect(hasStaffPlatformPrivileges(Role.SUPERADMIN)).toBe(true);
    expect(canManageStaffRoles(Role.SUPERADMIN)).toBe(true);
  });

  it("does not let ADMIN manage staff roles", () => {
    expect(isStaffRole(Role.ADMIN)).toBe(true);
    expect(canManageStaffRoles(Role.ADMIN)).toBe(false);
  });
});
