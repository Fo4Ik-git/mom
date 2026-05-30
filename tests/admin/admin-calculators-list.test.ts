import { describe, expect, it } from "vitest";
import { buildAdminCalculatorsSearchWhere } from "@/lib/admin/admin-calculators-list";

describe("admin calculators list helpers", () => {
  it("buildAdminCalculatorsSearchWhere returns undefined for empty query", () => {
    expect(buildAdminCalculatorsSearchWhere("")).toBeUndefined();
  });

  it("buildAdminCalculatorsSearchWhere searches name, slug, owner email", () => {
    expect(buildAdminCalculatorsSearchWhere("  demo  ")).toEqual({
      OR: [
        { name: { contains: "demo" } },
        { slug: { contains: "demo" } },
        { user: { email: { contains: "demo" } } },
      ],
    });
  });
});
