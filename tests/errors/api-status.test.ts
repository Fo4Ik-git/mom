import { describe, expect, it } from "vitest";
import {
  API_STATUS_KEY,
  API_SUCCESS,
  formatApiStatusLine,
  getApiStatusBlock,
  withApiStatus,
} from "@/lib/errors/api-status";
import { MODULE } from "@/lib/errors/Error";

describe("api status", () => {
  it("exposes General OK as code 0", () => {
    expect(API_SUCCESS).toEqual({
      module: MODULE.GENERAL,
      code: 0,
    });
  });

  it("merges status block into JSON payloads", () => {
    const body = withApiStatus({ calculator: { id: "x" } });
    expect(body).toEqual({
      calculator: { id: "x" },
      [API_STATUS_KEY]: {
        module: "General",
        code: 0,
      },
    });
    expect(getApiStatusBlock(body)?.code).toBe(0);
  });

  it("formats status line for UI", () => {
    expect(formatApiStatusLine(API_SUCCESS)).toBe("General · #0");
  });
});
