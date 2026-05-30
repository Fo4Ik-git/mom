import { headers } from "next/headers";

const APP_REQUEST_HEADER = "x-app-request";
const APP_REQUEST_VALUE = "1";
const APP_SECRET_HEADER = "x-app-secret";

function getAllowedOrigins(): string[] {
  return [
    process.env.AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter((value): value is string => Boolean(value));
}

function matchesAllowedOrigin(value: string, allowed: string): boolean {
  try {
    return new URL(value).origin === new URL(allowed).origin;
  } catch {
    return value.startsWith(allowed);
  }
}

/** Validates Server Action / RSC mutation requests from our frontend. */
export async function assertFrontendRequest(): Promise<void> {
  const headersList = await headers();
  const allowedOrigins = getAllowedOrigins();
  const appSecret = process.env.APP_REQUEST_SECRET;

  if (!appSecret || allowedOrigins.length === 0) {
    throw new Error("Server security is not configured");
  }

  if (headersList.get(APP_REQUEST_HEADER) !== APP_REQUEST_VALUE) {
    throw new Error("Forbidden");
  }

  if (headersList.get(APP_SECRET_HEADER) !== appSecret) {
    throw new Error("Forbidden");
  }

  const secFetchSite = headersList.get("sec-fetch-site");
  if (
    secFetchSite &&
    secFetchSite !== "same-origin" &&
    secFetchSite !== "same-site"
  ) {
    throw new Error("Forbidden");
  }

  const origin = headersList.get("origin");
  if (origin && allowedOrigins.some((o) => matchesAllowedOrigin(origin, o))) {
    return;
  }

  const referer = headersList.get("referer");
  if (
    referer &&
    allowedOrigins.some((o) => matchesAllowedOrigin(referer, o))
  ) {
    return;
  }

  throw new Error("Forbidden");
}
