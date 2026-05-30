import { NextResponse } from "next/server";
import { getErrorMeta } from "@/lib/errors/errors";

/** JSON key for module/code on API responses and inside `http` in logs. */
export const API_STATUS_KEY = "status" as const;

export type ApiStatusBlock = {
  module: string;
  code: number;
};

/** Successful API calls: module General, code 0. */
export const API_SUCCESS: ApiStatusBlock = {
  module: getErrorMeta("GENERAL", "OK").module,
  code: getErrorMeta("GENERAL", "OK").code,
};

export function isApiStatusBlock(value: unknown): value is ApiStatusBlock {
  if (!value || typeof value !== "object") {
    return false;
  }
  const row = value as ApiStatusBlock;
  return typeof row.module === "string" && typeof row.code === "number";
}

export function getApiStatusBlock(payload: unknown): ApiStatusBlock | null {
  if (!payload || typeof payload !== "object") {
    return null;
  }
  const row = payload as Record<string, unknown>;
  const nested = row[API_STATUS_KEY];
  if (isApiStatusBlock(nested)) {
    return nested;
  }
  return null;
}

export function withApiStatus<T extends Record<string, unknown>>(
  data: T,
): T & { status: ApiStatusBlock } {
  return {
    ...data,
    [API_STATUS_KEY]: { ...API_SUCCESS },
  };
}

export function apiJsonResponse<T extends Record<string, unknown>>(
  data: T,
  init?: ResponseInit,
): NextResponse {
  return NextResponse.json(withApiStatus(data), init);
}

/** Response JSON already includes a `status` block with module/code. */
export function hasApiStatusEnvelope(
  value: unknown,
): value is Record<string, unknown> & { status: ApiStatusBlock } {
  return getApiStatusBlock(value) !== null;
}

export function hasApiErrorShape(value: unknown): boolean {
  if (!value || typeof value !== "object") {
    return false;
  }
  return (
    "error" in (value as Record<string, unknown>) &&
    typeof (value as { error?: unknown }).error === "string" &&
    getApiStatusBlock(value) !== null
  );
}

export function formatApiStatusLine(block: ApiStatusBlock): string {
  return `${block.module} · #${block.code}`;
}
