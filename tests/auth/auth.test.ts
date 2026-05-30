import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/auth/password";
import {
  signupAbsoluteUrl,
  signupPathWithKey,
} from "@/lib/auth/signup-url";

describe("auth helpers", () => {
  it("hashPassword and verifyPassword round-trip", async () => {
    const hash = await hashPassword("secret-password");
    expect(hash).not.toBe("secret-password");
    expect(await verifyPassword("secret-password", hash)).toBe(true);
    expect(await verifyPassword("wrong", hash)).toBe(false);
  });

  it("signupPathWithKey encodes key", () => {
    expect(signupPathWithKey("AB CD")).toBe("/auth/signup?key=AB%20CD");
  });

  it("signupAbsoluteUrl strips trailing slash from origin", () => {
    expect(signupAbsoluteUrl("KEY", "https://app.test/")).toBe(
      "https://app.test/auth/signup?key=KEY",
    );
  });
});
