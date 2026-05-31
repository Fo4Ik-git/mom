import { AiAccessMode, Role } from "@prisma/client";
import { describe, expect, it } from "vitest";
import {
  isAiAssistantAccessActive,
  resolveAiAccessExpiresAt,
} from "@/lib/ai/ai-access";

describe("ai access", () => {
  it("admin without granted access has no AI", () => {
    expect(
      isAiAssistantAccessActive({
        id: "1",
        role: Role.ADMIN,
        aiAccessMode: AiAccessMode.OFF,
        aiAccessExpiresAt: null,
        aiAccessGrantedAt: null,
        aiAccessDurationDays: null,
      }),
    ).toBe(false);
  });

  it("admin with permanent access has AI", () => {
    expect(
      isAiAssistantAccessActive({
        id: "1",
        role: Role.ADMIN,
        aiAccessMode: AiAccessMode.PERMANENT,
        aiAccessExpiresAt: null,
        aiAccessGrantedAt: null,
        aiAccessDurationDays: null,
      }),
    ).toBe(true);
  });

  it("permanent mode grants access", () => {
    expect(
      isAiAssistantAccessActive({
        id: "1",
        role: Role.USER,
        aiAccessMode: AiAccessMode.PERMANENT,
        aiAccessExpiresAt: null,
        aiAccessGrantedAt: null,
        aiAccessDurationDays: null,
      }),
    ).toBe(true);
  });

  it("until date expires", () => {
    const past = new Date("2020-01-01T00:00:00.000Z");
    expect(
      isAiAssistantAccessActive(
        {
          id: "1",
          role: Role.USER,
          aiAccessMode: AiAccessMode.UNTIL_DATE,
          aiAccessExpiresAt: past,
          aiAccessGrantedAt: null,
          aiAccessDurationDays: null,
        },
        new Date("2026-01-01T00:00:00.000Z"),
      ),
    ).toBe(false);
  });

  it("duration mode computes expiry", () => {
    const grantedAt = new Date("2026-05-01T00:00:00.000Z");
    const expires = resolveAiAccessExpiresAt({
      id: "1",
      role: Role.USER,
      aiAccessMode: AiAccessMode.DURATION,
      aiAccessExpiresAt: null,
      aiAccessGrantedAt: grantedAt,
      aiAccessDurationDays: 30,
    });
    expect(expires?.toISOString()).toBe("2026-05-31T00:00:00.000Z");
  });
});
