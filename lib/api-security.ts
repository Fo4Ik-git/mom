
type RequestLike = Pick<Request, "headers">;

const APP_REQUEST_HEADER = "x-app-request";
const APP_REQUEST_VALUE = "1";
const APP_SECRET_HEADER = "x-app-secret";

function getConfiguredOrigins(): string[] {
  const origins = [
    process.env.AUTH_URL,
    process.env.NEXT_PUBLIC_APP_URL,
  ].filter((value): value is string => Boolean(value));

  return [...new Set(origins)];
}

function getRequestOrigin(request: RequestLike): string | null {
  const host = request.headers.get("host");
  if (!host) {
    return null;
  }

  const proto =
    request.headers.get("x-forwarded-proto") ??
    (host.includes("localhost") || host.startsWith("127.") ? "http" : "https");

  try {
    return new URL(`${proto}://${host}`).origin;
  } catch {
    return null;
  }
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

function headerOriginMatchesRequest(
  value: string | null,
  requestOrigin: string,
): boolean {
  if (!value) {
    return false;
  }

  try {
    return new URL(value).origin === requestOrigin;
  } catch {
    return matchesAllowedOrigin(value, requestOrigin);
  }
}

function isAllowedDevRequestOrigin(request: RequestLike): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  const requestOrigin = getRequestOrigin(request);
  if (!requestOrigin) {
    return false;
  }

  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");

  if (
    headerOriginMatchesRequest(origin, requestOrigin) ||
    headerOriginMatchesRequest(referer, requestOrigin)
  ) {
    return true;
  }

  // Samsung Internet and others sometimes omit Origin/Referer on same-site POST.
  if (!origin && !referer) {
    return true;
  }

  return false;
}

/**
 * Rejects API calls that are not initiated from our frontend.
 * Checks Origin/Referer, Sec-Fetch-Site, and a shared secret header.
 */
export function isAllowedFrontendRequest(request: RequestLike): boolean {
  const allowedOrigins = getConfiguredOrigins();
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

  if (isAllowedDevRequestOrigin(request)) {
    return true;
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
