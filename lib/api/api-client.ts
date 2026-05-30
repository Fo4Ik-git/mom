"use client";

const APP_REQUEST_HEADER = "x-app-request";
const APP_REQUEST_VALUE = "1";
const APP_SECRET_HEADER = "x-app-secret";

function getClientHeaders(): HeadersInit {
  const secret = process.env.NEXT_PUBLIC_APP_REQUEST_SECRET;
  if (!secret) {
    throw new Error("NEXT_PUBLIC_APP_REQUEST_SECRET is not configured");
  }

  return {
    [APP_REQUEST_HEADER]: APP_REQUEST_VALUE,
    [APP_SECRET_HEADER]: secret,
  };
}

export async function appFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const headers = new Headers(init?.headers);

  for (const [key, value] of Object.entries(getClientHeaders())) {
    headers.set(key, value);
  }

  if (init?.body && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  return fetch(input, {
    ...init,
    headers,
    credentials: "same-origin",
  });
}
