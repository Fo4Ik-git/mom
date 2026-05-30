import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/api/api-security", () => ({
  isAllowedFrontendRequest: vi.fn(),
}));

vi.mock("@/lib/access/access-keys", () => ({
  inspectAccessKey: vi.fn(),
}));

import { GET } from "@/app/api/auth/access-key/route";
import { inspectAccessKey } from "@/lib/access/access-keys";
import { isAllowedFrontendRequest } from "@/lib/api/api-security";

describe("GET /api/auth/access-key", () => {
  beforeEach(() => {
    vi.mocked(isAllowedFrontendRequest).mockReset();
    vi.mocked(inspectAccessKey).mockReset();
  });

  it("returns 403 when frontend security check fails", async () => {
    vi.mocked(isAllowedFrontendRequest).mockReturnValue(false);
    const response = await GET(new Request("https://app.test/api/auth/access-key"));
    expect(response.status).toBe(403);
  });

  it("returns invalid when code param missing", async () => {
    vi.mocked(isAllowedFrontendRequest).mockReturnValue(true);
    const response = await GET(new Request("https://app.test/api/auth/access-key"));
    expect(await response.json()).toEqual({ valid: false, reason: "invalid" });
  });

  it("delegates to inspectAccessKey", async () => {
    vi.mocked(isAllowedFrontendRequest).mockReturnValue(true);
    vi.mocked(inspectAccessKey).mockResolvedValue({
      valid: true,
      label: "VIP",
      kind: "REGISTRATION",
      usesLeft: 5,
    });
    const response = await GET(
      new Request("https://app.test/api/auth/access-key?code=ABC"),
    );
    expect(inspectAccessKey).toHaveBeenCalledWith("ABC");
    expect(await response.json()).toMatchObject({ valid: true, label: "VIP" });
  });
});
