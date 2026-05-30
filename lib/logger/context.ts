import "server-only";

import { AsyncLocalStorage } from "node:async_hooks";
import { decodeHeaderUtf8 } from "@/lib/http/safe-header";
import { generateTraceId } from "@/lib/logger/trace-id";

export type RequestUserContext = {
  id: string;
  email?: string | null;
  name?: string | null;
  role?: string;
};

export type RequestLogContext = {
  traceId: string;
  userId?: string;
  user?: RequestUserContext;
  method?: string;
  /** Extra fields handlers attach via setAuditDetail(). */
  auditDetail?: Record<string, unknown>;
};

const storage = new AsyncLocalStorage<RequestLogContext>();

export { generateTraceId };

export function getRequestContext(): RequestLogContext | undefined {
  return storage.getStore();
}

export function getTraceId(): string | undefined {
  return storage.getStore()?.traceId;
}

export function runWithRequestContext<T>(
  context: RequestLogContext,
  fn: () => T,
): T {
  return storage.run(context, fn);
}

export function bindRequestContextFromHeaders(headers: Headers): RequestLogContext {
  const userId = headers.get("x-user-id") ?? undefined;
  const email = headers.get("x-user-email");
  const nameRaw = headers.get("x-user-name");
  const name = nameRaw ? decodeHeaderUtf8(nameRaw) : null;
  const role = headers.get("x-user-role") ?? undefined;

  const user =
    userId ?
      {
        id: userId,
        email: email || null,
        name: name || null,
        role,
      }
    : undefined;

  return {
    traceId: headers.get("x-trace-id") ?? generateTraceId(),
    userId,
    user,
  };
}
