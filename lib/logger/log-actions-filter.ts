import { shouldAuditHttpRequest } from "@/lib/logger/http-log-policy";
import type { LogEntry } from "@/lib/logger/log-entry";

/** Fallback when legacy log lines lack `http.method`. */
const READ_ACTION_RE = /\.(read|list|status)$|^admin\.audit\.read$/;

/** Mutations and business audit lines (excludes GET/HEAD/OPTIONS and log viewer). */
export function matchesActionsOnlyFilter(entry: LogEntry): boolean {
  if (entry.event === "audit.action") {
    return true;
  }
  if (entry.event !== "audit.request") {
    return false;
  }

  if (entry.http_method && entry.path) {
    return shouldAuditHttpRequest(entry.http_method, entry.path);
  }

  const action = entry.action ?? "";
  return action.length > 0 && !READ_ACTION_RE.test(action);
}
