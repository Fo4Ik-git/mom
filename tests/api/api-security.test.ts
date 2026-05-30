import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  getAppFetchHeaders,
  isAllowedFrontendRequest,
} from "@/lib/api/api-security";
import { isAuthorizedCronRequest } from "@/lib/api/cron-auth";

function makeRequest(headers: Record<string, string>): Request {
  return new Request("https://app.test/api/test", { headers });
}

describe("api security", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = {
      ...env,
      AUTH_URL: "https://app.test",
      NEXT_PUBLIC_APP_URL: "https://app.test",
      APP_REQUEST_SECRET: "server-secret",
      NEXT_PUBLIC_APP_REQUEST_SECRET: "client-secret",
      NODE_ENV: "test",
    };
  });

  afterEach(() => {
    process.env = env;
  });

  it("rejects requests without required headers", () => {
    expect(isAllowedFrontendRequest(makeRequest({}))).toBe(false);
    expect(
      isAllowedFrontendRequest(
        makeRequest({
          host: "app.test",
          "x-app-request": "1",
        }),
      ),
    ).toBe(false);
  });

  it("accepts valid same-origin frontend request", () => {
    expect(
      isAllowedFrontendRequest(
        makeRequest({
          host: "app.test",
          origin: "https://app.test",
          "x-app-request": "1",
          "x-app-secret": "server-secret",
          "sec-fetch-site": "same-origin",
        }),
      ),
    ).toBe(true);
  });

  it("rejects cross-site sec-fetch-site", () => {
    expect(
      isAllowedFrontendRequest(
        makeRequest({
          host: "app.test",
          origin: "https://app.test",
          "x-app-request": "1",
          "x-app-secret": "server-secret",
          "sec-fetch-site": "cross-site",
        }),
      ),
    ).toBe(false);
  });

  it("getAppFetchHeaders throws when client secret missing", () => {
    delete process.env.NEXT_PUBLIC_APP_REQUEST_SECRET;
    expect(() => getAppFetchHeaders()).toThrow(/not configured/);
  });

  it("getAppFetchHeaders returns security headers", () => {
    const headers = getAppFetchHeaders() as Record<string, string>;
    expect(headers["x-app-request"]).toBe("1");
    expect(headers["x-app-secret"]).toBe("client-secret");
  });
});

describe("cron auth", () => {
  const env = process.env;

  afterEach(() => {
    process.env = env;
  });

  it("isAuthorizedCronRequest validates bearer token", () => {
    process.env.CRON_SECRET = "cron-xyz";
    expect(
      isAuthorizedCronRequest(
        makeRequest({ authorization: "Bearer cron-xyz" }),
      ),
    ).toBe(true);
    expect(
      isAuthorizedCronRequest(
        makeRequest({ authorization: "Bearer wrong" }),
      ),
    ).toBe(false);
    delete process.env.CRON_SECRET;
    expect(isAuthorizedCronRequest(makeRequest({}))).toBe(false);
  });
});
