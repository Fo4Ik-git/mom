import { describe, expect, it } from "vitest";
import { matchesActionsOnlyFilter } from "@/lib/logger/log-actions-filter";
import type { LogEntry } from "@/lib/logger/log-entry";

function entry(partial: Partial<LogEntry>): LogEntry {
  return {
    lineNumber: 1,
    raw: "{}",
    ...partial,
  };
}

describe("matchesActionsOnlyFilter", () => {
  it("excludes GET audit.request", () => {
    expect(
      matchesActionsOnlyFilter(
        entry({
          event: "audit.request",
          action: "admin.stats.read",
          http_method: "GET",
          path: "/api/admin/stats",
        }),
      ),
    ).toBe(false);
  });

  it("includes POST mutations", () => {
    expect(
      matchesActionsOnlyFilter(
        entry({
          event: "audit.request",
          action: "calculator.create",
          http_method: "POST",
          path: "/api/calculators",
        }),
      ),
    ).toBe(true);
  });

  it("includes standalone audit.action", () => {
    expect(
      matchesActionsOnlyFilter(
        entry({ event: "audit.action", action: "cron.access_expiry" }),
      ),
    ).toBe(true);
  });

  it("excludes read actions without http block", () => {
    expect(
      matchesActionsOnlyFilter(
        entry({ event: "audit.request", action: "admin.stats.read" }),
      ),
    ).toBe(false);
  });
});
