import { describe, expect, it } from "vitest";
import {
  resolveAuditAction,
  shouldAuditHttpRequest,
} from "@/lib/logger/http-log-policy";

describe("http-log-policy", () => {
  it("skips log viewer and GET requests", () => {
    expect(shouldAuditHttpRequest("GET", "/api/admin/logs")).toBe(false);
    expect(shouldAuditHttpRequest("GET", "/api/calculators")).toBe(false);
    expect(shouldAuditHttpRequest("POST", "/api/admin/logs")).toBe(false);
  });

  it("audits mutations", () => {
    expect(shouldAuditHttpRequest("POST", "/api/calculators")).toBe(true);
    expect(shouldAuditHttpRequest("PATCH", "/api/admin/users/abc")).toBe(true);
  });

  it("resolves human-readable actions", () => {
    expect(resolveAuditAction("POST", "/api/calculators")).toBe(
      "calculator.create",
    );
    expect(resolveAuditAction("PATCH", "/api/admin/users/u1")).toBe(
      "admin.user.update",
    );
    expect(resolveAuditAction("GET", "/api/admin/logs")).toBe("admin.logs.read");
  });
});
