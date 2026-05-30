import { describe, expect, it } from "vitest";
import { buildAdminAccessKeysSearchWhere } from "@/lib/admin/admin-access-keys-list";
import { buildTablePagination, parseTablePage } from "@/lib/ui/table-pagination";

describe("admin access keys list helpers", () => {
  it("buildAdminAccessKeysSearchWhere returns undefined for empty query", () => {
    expect(buildAdminAccessKeysSearchWhere("")).toBeUndefined();
  });

  it("buildAdminAccessKeysSearchWhere searches code and label", () => {
    expect(buildAdminAccessKeysSearchWhere("z8m778")).toEqual({
      OR: [{ code: { contains: "Z8M778" } }, { label: { contains: "z8m778" } }],
    });
  });

  it("buildTablePagination clamps page to totalPages", () => {
    expect(buildTablePagination(5, 10, 25)).toEqual({
      page: 3,
      pageSize: 10,
      total: 25,
      totalPages: 3,
    });
  });

  it("parseTablePage clamps invalid values", () => {
    expect(parseTablePage("0")).toBe(1);
  });
});
