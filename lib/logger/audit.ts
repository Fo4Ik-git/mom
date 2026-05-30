import "server-only";

import { getRequestContext } from "@/lib/logger/context";
import { getLogger } from "@/lib/logger/index";

/** Add business context to the current request audit (merged into the completion log). */
export function setAuditDetail(detail: Record<string, unknown>): void {
  const ctx = getRequestContext();
  if (!ctx) {
    return;
  }
  ctx.auditDetail = { ...ctx.auditDetail, ...detail };
}

/** Standalone audit line (e.g. background job without HTTP wrapper). */
export function logAudit(
  action: string,
  detail?: Record<string, unknown>,
  message?: string,
): void {
  getLogger().info(
    {
      event: "audit.action",
      action,
      ...detail,
    },
    message ?? action,
  );
}
