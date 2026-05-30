import { describe, expect, it } from "vitest";
import { API_SUCCESS, getApiStatusBlock } from "@/lib/errors/api-status";

describe("signin-check API response shape", () => {
  it("keeps auth outcome separate from API status envelope", () => {
    const body = {
      result: "ok",
      status: { ...API_SUCCESS },
    };

    expect(body.result).toBe("ok");
    expect(getApiStatusBlock(body)?.code).toBe(0);
  });

  it("legacy status string must not be mistaken for success", () => {
    const brokenClientView = {
      status: { module: "General", code: 0 },
    };

    expect((brokenClientView as { result?: string }).result).not.toBe("ok");
    expect(getApiStatusBlock(brokenClientView)?.code).toBe(0);
  });
});
