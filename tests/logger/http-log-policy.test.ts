import { describe, expect, it } from "vitest";
import {
  resolveAuditAction,
  shouldAuditHttpRequest,
  shouldLogHttpRequest,
} from "@/lib/logger/http-log-policy";

describe("http-log-policy", () => {
  it("skips log viewer for request logging", () => {
    expect(shouldLogHttpRequest("GET", "/api/admin/audit")).toBe(false);
    expect(shouldLogHttpRequest("POST", "/api/admin/audit")).toBe(false);
  });

  it("logs GET calculators list", () => {
    expect(shouldLogHttpRequest("GET", "/api/calculators")).toBe(true);
  });

  it("skips mutations-only audit for GET", () => {
    expect(shouldAuditHttpRequest("GET", "/api/calculators")).toBe(false);
  });

  it("audits mutations", () => {
    expect(shouldAuditHttpRequest("POST", "/api/calculators")).toBe(true);
    expect(shouldAuditHttpRequest("PATCH", "/api/admin/users/abc")).toBe(true);
  });

  it("uses GET for expiry status read", () => {
    expect(resolveAuditAction("GET", "/api/admin/access-expiry-check")).toBe(
      "admin.access_expiry.status",
    );
    expect(resolveAuditAction("POST", "/api/admin/access-expiry-check")).toBe(
      "admin.access_expiry.run",
    );
  });

  it("resolves human-readable actions", () => {
    expect(resolveAuditAction("POST", "/api/calculators")).toBe(
      "calculator.create",
    );
    expect(resolveAuditAction("PATCH", "/api/admin/users/u1")).toBe(
      "admin.user.update",
    );
    expect(resolveAuditAction("GET", "/api/admin/audit")).toBe("admin.audit.read");
  });
});
