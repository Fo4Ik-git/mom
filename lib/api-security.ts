import type { NextRequest } from "next/server";

type RequestLike = Pick<Request, "headers">;

const APP_REQUEST_HEADER = "x-app-request";
const APP_REQUEST_VALUE = "1";
const APP_SECRET_HEADER = "x-app-secret";

function getAllowedOrigins(): string[] {
  const origins = [
    process.env.AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(origins)];
}

function matchesAllowedOrigin(value: string, allowed: string): boolean {
  try {
    const originUrl = new URL(value);
    const allowedUrl = new URL(allowed);
    return originUrl.origin === allowedUrl.origin;
  } catch {
    return value.startsWith(allowed);
  }
}

/**
 * Rejects API calls that are not initiated from our frontend.
 * Checks Origin/Referer, Sec-Fetch-Site, and a shared secret header.
 */
export function isAllowedFrontendRequest(request: RequestLike): boolean {
  const allowedOrigins = getAllowedOrigins();
  if (allowedOrigins.length === 0) {
    return false;
  }

  const appSecret = process.env.APP_REQUEST_SECRET;
  if (!appSecret) {
    return false;
  }

  if (request.headers.get(APP_REQUEST_HEADER) !== APP_REQUEST_VALUE) {
    return false;
  }

  if (request.headers.get(APP_SECRET_HEADER) !== appSecret) {
    return false;
  }

  const secFetchSite = request.headers.get("sec-fetch-site");
  if (
    secFetchSite &&
    secFetchSite !== "same-origin" &&
    secFetchSite !== "same-site"
  ) {
    return false;
  }

  const origin = request.headers.get("origin");
  if (origin) {
    return allowedOrigins.some((allowed) =>
      matchesAllowedOrigin(origin, allowed),
    );
  }

  const referer = request.headers.get("referer");
  if (referer) {
    return allowedOrigins.some((allowed) =>
      matchesAllowedOrigin(referer, allowed),
    );
  }

  return false;
}

export function getAppFetchHeaders(): HeadersInit {
  const secret = process.env.NEXT_PUBLIC_APP_REQUEST_SECRET;
  if (!secret) {
    throw new Error("NEXT_PUBLIC_APP_REQUEST_SECRET is not configured");
  }

  return {
    [APP_REQUEST_HEADER]: APP_REQUEST_VALUE,
    [APP_SECRET_HEADER]: secret,
    "Content-Type": "application/json",
  };
}
