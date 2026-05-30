import { describe, expect, it } from "vitest";
import { decodeHeaderUtf8, encodeHeaderUtf8 } from "@/lib/http/safe-header";

describe("safe-header", () => {
  it("passes ASCII through unchanged", () => {
    expect(encodeHeaderUtf8("Admin")).toBe("Admin");
    expect(decodeHeaderUtf8("Admin")).toBe("Admin");
  });

  it("round-trips Cyrillic names", () => {
    const name = "Вікторія";
    const encoded = encodeHeaderUtf8(name);
    expect(encoded.startsWith("b64:")).toBe(true);
    expect(decodeHeaderUtf8(encoded)).toBe(name);
  });
});
