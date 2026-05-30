import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
import {
  bindRequestContextFromHeaders,
  generateTraceId,
  runWithRequestContext,
  getTraceId,
} from "@/lib/logger/context";

describe("request log context", () => {
  it("generates UUID trace ids", () => {
    const id = generateTraceId();
    expect(id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i,
    );
  });

  it("reads trace_id from headers", () => {
    const headers = new Headers({ "x-trace-id": "fixed-trace-id" });
    const ctx = bindRequestContextFromHeaders(headers);
    expect(ctx.traceId).toBe("fixed-trace-id");
  });

  it("propagates trace_id inside runWithRequestContext", () => {
    runWithRequestContext({ traceId: "ctx-trace" }, () => {
      expect(getTraceId()).toBe("ctx-trace");
    });
    expect(getTraceId()).toBeUndefined();
  });
});
