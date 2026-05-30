import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/cron-auth", () => ({
  isAuthorizedCronRequest: vi.fn(),
}));

vi.mock("@/lib/access/access-expiry-check", () => ({
  runScheduledAccessExpiryCheckIfDue: vi.fn(),
}));

import { GET, POST } from "@/app/api/cron/access-expiry/route";
import { runScheduledAccessExpiryCheckIfDue } from "@/lib/access/access-expiry-check";
import { isAuthorizedCronRequest } from "@/lib/api/cron-auth";

describe("cron /api/cron/access-expiry", () => {
  beforeEach(() => {
    vi.mocked(isAuthorizedCronRequest).mockReset();
    vi.mocked(runScheduledAccessExpiryCheckIfDue).mockReset();
  });

  it("GET returns 401 without cron auth", async () => {
    vi.mocked(isAuthorizedCronRequest).mockReturnValue(false);
    const response = await GET(new Request("https://app.test/api/cron/access-expiry"));
    expect(response.status).toBe(401);
  });

  it("GET runs scheduled check when authorized", async () => {
    vi.mocked(isAuthorizedCronRequest).mockReturnValue(true);
    vi.mocked(runScheduledAccessExpiryCheckIfDue).mockResolvedValue({
      ran: true,
      bannedCount: 2,
      ranAt: "2025-01-01T00:00:00.000Z",
    });
    const response = await GET(new Request("https://app.test/api/cron/access-expiry"));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ran: true, bannedCount: 2 });
  });

  it("POST delegates to GET", async () => {
    vi.mocked(isAuthorizedCronRequest).mockReturnValue(true);
    vi.mocked(runScheduledAccessExpiryCheckIfDue).mockResolvedValue({
      ran: false,
      bannedCount: 0,
      ranAt: null,
    });
    const response = await POST(new Request("https://app.test/api/cron/access-expiry"));
    expect(response.status).toBe(200);
  });
});
