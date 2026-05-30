import { NextResponse } from "next/server";
import {
  API_STATUS_KEY,
  type ApiStatusBlock,
} from "@/lib/errors/api-status";
import {
  ERROR_MESSAGES,
  type ErrorCodeName,
  type ErrorModuleKey,
  getErrorMeta,
} from "@/lib/errors/errors";

export type ApiErrorBody = {
  error: string;
  status: ApiStatusBlock;
  issues?: string[];
};

export function apiErrorBody<M extends ErrorModuleKey>(
  moduleKey: M,
  codeName: ErrorCodeName<M>,
  options?: {
    message?: string;
    issues?: string[];
  },
): ApiErrorBody {
  const meta = getErrorMeta(moduleKey, codeName);
  const defaultMessage = ERROR_MESSAGES[moduleKey][codeName];
  return {
    error: options?.message ?? defaultMessage,
    [API_STATUS_KEY]: {
      module: meta.module,
      code: meta.code,
    },
    ...(options?.issues?.length ? { issues: options.issues } : {}),
  };
}

export function apiErrorResponse<M extends ErrorModuleKey>(
  moduleKey: M,
  codeName: ErrorCodeName<M>,
  status: number,
  options?: {
    message?: string;
    issues?: string[];
  },
): NextResponse {
  return NextResponse.json(apiErrorBody(moduleKey, codeName, options), {
    status,
  });
}

/** Attach module/code to a plain legacy `{ error, issues? }` payload. */
export function enrichLegacyError(
  moduleKey: ErrorModuleKey,
  codeName: ErrorCodeName<typeof moduleKey>,
  payload: { error: string; issues?: string[] },
): ApiErrorBody {
  return apiErrorBody(moduleKey, codeName, {
    message: payload.error,
    issues: payload.issues,
  });
}
