import { describe, expect, it } from "vitest";
import { Role } from "@prisma/client";
import {
  isBanIssueVisible,
  isExpiredAccessIssueVisible,
} from "@/lib/admin/admin-issues";

const baseUser = {
  role: Role.USER,
  banned: false,
  accessExpiresAt: null as Date | null,
  issueBanDismissedAt: null as Date | null,
  issueExpiredDismissedFor: null as Date | null,
};

describe("admin issues visibility", () => {
  it("shows ban issue when banned and not dismissed", () => {
    expect(
      isBanIssueVisible({ ...baseUser, banned: true }),
    ).toBe(true);
    expect(
      isBanIssueVisible({
        ...baseUser,
        banned: true,
        issueBanDismissedAt: new Date(),
      }),
    ).toBe(false);
  });

  it("shows expired access issue for USER with past expiry", () => {
    const expired = new Date("2020-01-01");
    const now = new Date("2025-01-01");
    expect(
      isExpiredAccessIssueVisible(
        { ...baseUser, accessExpiresAt: expired },
        now,
      ),
    ).toBe(true);
  });

  it("hides expired issue when dismissed for same expiry date", () => {
    const expired = new Date("2020-01-01T12:00:00Z");
    expect(
      isExpiredAccessIssueVisible({
        ...baseUser,
        accessExpiresAt: expired,
        issueExpiredDismissedFor: expired,
      }),
    ).toBe(false);
  });

  it("shows expired issue again when expiry date changes after dismissal", () => {
    const oldExpiry = new Date("2020-01-01T12:00:00Z");
    const newExpiry = new Date("2021-01-01T12:00:00Z");
    expect(
      isExpiredAccessIssueVisible(
        {
          ...baseUser,
          accessExpiresAt: newExpiry,
          issueExpiredDismissedFor: oldExpiry,
        },
        new Date("2025-01-01"),
      ),
    ).toBe(true);
  });

  it("never shows expired issue for ADMIN", () => {
    expect(
      isExpiredAccessIssueVisible({
        ...baseUser,
        role: Role.ADMIN,
        accessExpiresAt: new Date("2020-01-01"),
      }),
    ).toBe(false);
  });
});
