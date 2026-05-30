import { describe, expect, it } from "vitest";
import { normalizeAccessKeyCode } from "@/lib/access/access-key-code";

describe("normalizeAccessKeyCode", () => {
  it("trims, uppercases, and removes spaces", () => {
    expect(normalizeAccessKeyCode("  ab cd  ")).toBe("ABCD");
    expect(normalizeAccessKeyCode("xYz123")).toBe("XYZ123");
  });
});
