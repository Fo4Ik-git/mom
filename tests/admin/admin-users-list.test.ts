import { describe, expect, it } from "vitest";
import {
  buildAdminUsersSearchWhere,
  parseAdminUsersPage,
  parseAdminUsersPageSize,
} from "@/lib/admin/admin-users-list";

describe("admin users list helpers", () => {
  it("parseAdminUsersPageSize returns valid sizes or default 10", () => {
    expect(parseAdminUsersPageSize("25")).toBe(25);
    expect(parseAdminUsersPageSize("99")).toBe(10);
    expect(parseAdminUsersPageSize(null)).toBe(10);
  });

  it("parseAdminUsersPage clamps invalid values to 1", () => {
    expect(parseAdminUsersPage("3")).toBe(3);
    expect(parseAdminUsersPage("0")).toBe(1);
    expect(parseAdminUsersPage("-1")).toBe(1);
    expect(parseAdminUsersPage("abc")).toBe(1);
    expect(parseAdminUsersPage(null)).toBe(1);
  });

  it("buildAdminUsersSearchWhere returns undefined for empty query", () => {
    expect(buildAdminUsersSearchWhere("")).toBeUndefined();
    expect(buildAdminUsersSearchWhere("   ")).toBeUndefined();
  });

  it("buildAdminUsersSearchWhere searches email and name", () => {
    expect(buildAdminUsersSearchWhere("  Anna  ")).toEqual({
      OR: [{ email: { contains: "anna" } }, { name: { contains: "Anna" } }],
    });
  });
});
