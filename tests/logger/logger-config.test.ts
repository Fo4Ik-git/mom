import { describe, expect, it, beforeEach, afterEach, vi } from "vitest";

describe("logConfig", () => {
  const env = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...env };
  });

  it("defaults retention to 14 days", async () => {
    delete process.env.LOG_RETENTION_DAYS;
    const { logConfig } = await import("@/lib/logger/config");
    expect(logConfig.retentionDays).toBe(14);
  });

  it("clamps invalid retention to 14", async () => {
    process.env.LOG_RETENTION_DAYS = "0";
    const { logConfig } = await import("@/lib/logger/config");
    expect(logConfig.retentionDays).toBe(14);
  });

  it("respects LOG_DIR", async () => {
    process.env.LOG_DIR = "/tmp/test-logs";
    const { logConfig } = await import("@/lib/logger/config");
    expect(logConfig.dir).toBe("/tmp/test-logs");
  });
});
