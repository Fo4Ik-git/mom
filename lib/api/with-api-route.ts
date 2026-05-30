import "server-only";

import { NextResponse } from "next/server";
import {
  API_STATUS_KEY,
  API_SUCCESS,
  getApiStatusBlock,
  hasApiErrorShape,
  hasApiStatusEnvelope,
  type ApiStatusBlock,
} from "@/lib/errors/api-status";
import {
  bindRequestContextFromHeaders,
  generateTraceId,
  getRequestContext,
  runWithRequestContext,
} from "@/lib/logger/context";
import {
  extractAuditResourceIds,
  resolveAuditAction,
  shouldLogHttpRequest,
} from "@/lib/logger/http-log-policy";
import {
  captureRequestLog,
  captureResponseLog,
} from "@/lib/logger/http-payload-log";
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

function emitRequestLog(
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

async function readJsonBody(response: Response): Promise<unknown | null> {
  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    return null;
  }
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function statusBlockFromPayload(
  payload: unknown,
  httpStatus: number,
): ApiStatusBlock {
  const block = getApiStatusBlock(payload);
  if (block) {
    return { module: block.module, code: block.code };
  }

  if (httpStatus >= 400) {
    return { module: "Platform", code: httpStatus };
  }

  return API_SUCCESS;
}

function isFailedRequest(payload: unknown, httpStatus: number): boolean {
  return httpStatus >= 400 || hasApiErrorShape(payload);
}

function buildHttpLog(
  meta: { method: string; path: string; query?: string },
  httpStatus: number,
  durationMs: number,
  statusBlock: ApiStatusBlock,
) {
  return {
    method: meta.method,
    path: meta.path,
    status_code: httpStatus,
    duration_ms: durationMs,
    ...(meta.query ? { query: meta.query } : {}),
    [API_STATUS_KEY]: statusBlock,
  };
}

/** Adds General / code 0 in a `status` block on successful JSON responses. */
async function enrichJsonResponse(response: Response): Promise<Response> {
  if (response.status === 204 || response.status === 304) {
    return response;
  }

  const type = response.headers.get("content-type") ?? "";
  if (!type.includes("application/json")) {
    return response;
  }

  const payload = await readJsonBody(response.clone());
  if (payload === null || typeof payload !== "object") {
    return response;
  }

  if (hasApiStatusEnvelope(payload)) {
    return response;
  }

  if (response.status >= 400) {
    return response;
  }

  const headers = new Headers(response.headers);
  return NextResponse.json(
    {
      ...(payload as Record<string, unknown>),
      [API_STATUS_KEY]: { ...API_SUCCESS },
    },
    {
      status: response.status,
      statusText: response.statusText,
      headers,
    },
  );
}

/**
 * Wraps App Router handlers with trace_id, response status fields, and request logs.
 */
export function withApiRoute<
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  T extends (request: Request, context: any) => Response | Promise<Response>,
>(handler: T): T {
  const wrapped = async (request: Request, context: RouteContext) => {
    const meta = requestMeta(request);
    const baseContext = bindRequestContextFromHeaders(request.headers);
    const traceId = baseContext.traceId || generateTraceId();
    const logRequest = shouldLogHttpRequest(meta.method, meta.path);
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
        const requestLog =
          logRequest ? await captureRequestLog(request) : undefined;

        try {
          const raw = await handler(request, context);
          const response = await enrichJsonResponse(raw);
          const durationMs = Date.now() - started;

          if (logRequest) {
            const reqCtx = getRequestContext();
            const payload = await readJsonBody(response.clone());
            const statusBlock = statusBlockFromPayload(payload, response.status);
            const failed = isFailedRequest(payload, response.status);
            const responseLog = await captureResponseLog(response);

            emitRequestLog(
              response.status >= 500 ? "error" : failed ? "warn" : "info",
              {
                event: "audit.request",
                action,
                ...resourceIds,
                ...(reqCtx?.auditDetail ?? {}),
                http: buildHttpLog(meta, response.status, durationMs, statusBlock),
                ...(requestLog ? { request: requestLog } : {}),
                ...(responseLog ? { response: responseLog } : {}),
                ...(reqCtx?.user ? { user: reqCtx.user } : {}),
              },
              failed
                ? `${action} (${statusBlock.module} #${statusBlock.code})`
                : `${action} (General #0)`,
            );
          }

          return attachTraceHeader(response, traceId);
        } catch (error) {
          const durationMs = Date.now() - started;

          if (logRequest) {
            const reqCtx = getRequestContext();
            const statusBlock = { module: "Platform", code: 500 };
            emitRequestLog(
              "error",
              {
                event: "audit.request",
                action,
                ...resourceIds,
                ...(reqCtx?.auditDetail ?? {}),
                http: buildHttpLog(meta, 500, durationMs, statusBlock),
                ...(requestLog ? { request: requestLog } : {}),
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
