import "server-only";

import { NextResponse } from "next/server";
import {
  bindRequestContextFromHeaders,
  generateTraceId,
  getRequestContext,
  runWithRequestContext,
} from "@/lib/logger/context";
import {
  extractAuditResourceIds,
  resolveAuditAction,
  shouldAuditHttpRequest,
} from "@/lib/logger/http-log-policy";
import { getLogger } from "@/lib/logger/index";
import { serializeError } from "@/lib/logger/serialize";

type RouteContext = { params: Promise<Record<string, string>> };

function requestMeta(request: Request) {
  const url = new URL(request.url);
  return {
    method: request.method,
    path: url.pathname,
    query: url.search || undefined,
  };
}

function attachTraceHeader(response: Response, traceId: string): Response {
  const headers = new Headers(response.headers);
  headers.set("x-trace-id", traceId);
  return new NextResponse(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers,
  });
}

function emitAudit(
  level: "info" | "warn" | "error",
  fields: Record<string, unknown>,
  message: string,
) {
  const logger = getLogger();
  if (level === "error") {
    logger.error(fields, message);
  } else if (level === "warn") {
    logger.warn(fields, message);
  } else {
    logger.info(fields, message);
  }
}

/**
 * Wraps App Router handlers with trace_id and audit logs for mutations.
 */
export function withApiRoute<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (request: Request, context: any) => Response | Promise<Response>,
>(handler: T): T {
  const wrapped = async (request: Request, context: RouteContext) => {
    const meta = requestMeta(request);
    const baseContext = bindRequestContextFromHeaders(request.headers);
    const traceId = baseContext.traceId || generateTraceId();
    const audit = shouldAuditHttpRequest(meta.method, meta.path);
    const action = resolveAuditAction(meta.method, meta.path);
    const resourceIds = extractAuditResourceIds(meta.path);

    return runWithRequestContext(
      {
        ...baseContext,
        traceId,
        method: meta.method,
      },
      async () => {
        const started = Date.now();

        try {
          const response = await handler(request, context);
          const durationMs = Date.now() - started;

          if (audit) {
            const reqCtx = getRequestContext();
            const failed = response.status >= 400;
            emitAudit(
              response.status >= 500 ? "error" : failed ? "warn" : "info",
              {
                event: "audit.action",
                action,
                outcome: failed ? "failed" : "ok",
                ...resourceIds,
                ...(reqCtx?.auditDetail ?? {}),
                http: {
                  method: meta.method,
                  path: meta.path,
                  status: response.status,
                  duration_ms: durationMs,
                  ...(meta.query ? { query: meta.query } : {}),
                },
                ...(reqCtx?.user ? { user: reqCtx.user } : {}),
              },
              failed ? `${action} (${response.status})` : action,
            );
          }

          return attachTraceHeader(response, traceId);
        } catch (error) {
          const durationMs = Date.now() - started;

          if (audit) {
            const reqCtx = getRequestContext();
            emitAudit(
              "error",
              {
                event: "audit.action",
                action,
                ...resourceIds,
                ...(reqCtx?.auditDetail ?? {}),
                http: {
                  method: meta.method,
                  path: meta.path,
                  status: 500,
                  duration_ms: durationMs,
                },
                ...(reqCtx?.user ? { user: reqCtx.user } : {}),
                err: serializeError(error),
              },
              `${action} failed`,
            );
          }
          throw error;
        }
      },
    );
  };
  return wrapped as T;
}
