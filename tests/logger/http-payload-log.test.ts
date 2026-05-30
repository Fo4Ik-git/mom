import { describe, expect, it } from "vitest";
import {
  captureRequestLog,
  sanitizeForLog,
} from "@/lib/logger/http-payload-log";

describe("http payload log", () => {
  it("sanitizes sensitive keys", () => {
    expect(
      sanitizeForLog({
        name: "Calc",
        password: "secret123",
        nested: { token: "abc" },
      }),
    ).toEqual({
      name: "Calc",
      password: "[redacted]",
      nested: { token: "[redacted]" },
    });
  });

  it("captures GET query as request", async () => {
    const request = new Request(
      "http://localhost/api/calculators?limit=10&tag=a&tag=b",
      { method: "GET" },
    );
    expect(await captureRequestLog(request)).toEqual({
      query: { limit: "10", tag: ["a", "b"] },
    });
  });

  it("captures POST JSON body as request", async () => {
    const request = new Request("http://localhost/api/calculators", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name: "New", password: "hide-me" }),
    });
    expect(await captureRequestLog(request)).toEqual({
      body: { name: "New", password: "[redacted]" },
    });
  });
});
