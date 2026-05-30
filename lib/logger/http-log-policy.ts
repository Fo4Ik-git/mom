/** Paths that must not produce HTTP audit lines (e.g. log viewer itself). */
const SKIP_AUDIT_PATHS = new Set([
  "/api/admin/audit",
  "/api/admin/logs",
  "/api/auth/session",
]);

const SKIP_AUDIT_PREFIXES = ["/api/auth/csrf"];

const READ_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Log every API request (including GET) except noisy paths. */
export function shouldLogHttpRequest(method: string, pathname: string): boolean {
  if (SKIP_AUDIT_PATHS.has(pathname)) {
    return false;
  }
  if (SKIP_AUDIT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }
  return true;
}

/** @deprecated Use shouldLogHttpRequest — mutations-only logging. */
export function shouldAuditHttpRequest(method: string, pathname: string): boolean {
  const upper = method.toUpperCase();
  if (READ_METHODS.has(upper)) {
    return false;
  }
  if (SKIP_AUDIT_PATHS.has(pathname)) {
    return false;
  }
  if (SKIP_AUDIT_PREFIXES.some((prefix) => pathname.startsWith(prefix))) {
    return false;
  }
  return true;
}

/** Stable action key for audit logs (not raw "METHOD /path"). */
export function resolveAuditAction(method: string, pathname: string): string {
  const m = method.toUpperCase();
  const parts = pathname.split("/").filter(Boolean);

  if (parts[0] !== "api") {
    return `http.${m.toLowerCase()}`;
  }

  const [, area, ...rest] = parts;

  if (area === "auth") {
    if (parts[2] === "signup") return "auth.signup";
    if (parts[2] === "signin-check") return "auth.signin_check";
    if (parts[2] === "access-key") return "auth.access_key_validate";
    if (parts[2] === "callback") return "auth.oauth_callback";
    return `auth.${m.toLowerCase()}`;
  }

  if (area === "cron") {
    return "cron.access_expiry";
  }

  if (area === "calculators") {
    if (rest[0] === "by-slug") return "calculator.view_by_slug";
    if (!rest[0]) return m === "POST" ? "calculator.create" : "calculator.list";
    if (rest[1] === "shares") {
      if (rest[2] && m === "DELETE") return "calculator.share.revoke";
      if (m === "POST") return "calculator.share.grant";
      return "calculator.share.list";
    }
    if (m === "PATCH") return "calculator.update";
    if (m === "DELETE") return "calculator.delete";
    if (m === "GET") return "calculator.read";
    return `calculator.${m.toLowerCase()}`;
  }

  if (area === "admin") {
    if (rest[0] === "audit" || rest[0] === "logs") {
      return "admin.audit.read";
    }
    if (rest[0] === "stats") return "admin.stats.read";
    if (rest[0] === "settings") return m === "PATCH" ? "admin.settings.update" : "admin.settings.read";
    if (rest[0] === "access-keys") {
      if (rest[1] && m === "DELETE") return "admin.access_key.delete";
      if (rest[1] && m === "PATCH") return "admin.access_key.update";
      if (m === "POST") return "admin.access_key.create";
      return "admin.access_key.list";
    }
    if (rest[0] === "access-expiry-check") {
      return m === "GET" ? "admin.access_expiry.status" : "admin.access_expiry.run";
    }
    if (rest[0] === "users") {
      if (rest[2] === "dismiss-issue") return "admin.user.dismiss_issue";
      if (rest[1] && m === "PATCH") return "admin.user.update";
      if (rest[1] && m === "DELETE") return "admin.user.delete";
      if (m === "POST") return "admin.user.create";
      return "admin.user.list";
    }
    if (rest[0] === "calculators") {
      if (rest[2] === "shares") {
        if (rest[3] && m === "DELETE") return "admin.calculator.share.revoke";
        if (m === "POST") return "admin.calculator.share.grant";
        return "admin.calculator.shares.list";
      }
      if (rest[1] && m === "PATCH") return "admin.calculator.update";
      if (rest[1] && m === "DELETE") return "admin.calculator.delete";
      if (m === "GET") return "admin.calculator.read";
      return "admin.calculator.list";
    }
    return `admin.${m.toLowerCase()}`;
  }

  if (area === "user" && rest[0] === "quota") {
    return "user.quota.read";
  }

  return `api.${m.toLowerCase()}`;
}

/** Resource ids parsed from URL for audit context. */
export function extractAuditResourceIds(
  pathname: string,
): Record<string, string> {
  const parts = pathname.split("/").filter(Boolean);
  const ids: Record<string, string> = {};

  const set = (key: string, value: string | undefined) => {
    if (value && !value.includes("[")) {
      ids[key] = value;
    }
  };

  if (parts[1] === "calculators" && parts[2] && parts[2] !== "by-slug") {
    set("calculator_id", parts[2]);
    if (parts[3] === "shares" && parts[4]) {
      set("share_user_id", parts[4]);
    }
  }

  if (parts[1] === "admin") {
    if (parts[2] === "users" && parts[3]) {
      set("target_user_id", parts[3]);
    }
    if (parts[2] === "calculators" && parts[3]) {
      set("calculator_id", parts[3]);
      if (parts[4] === "shares" && parts[5]) {
        set("share_user_id", parts[5]);
      }
    }
    if (parts[2] === "access-keys" && parts[3]) {
      set("access_key_id", parts[3]);
    }
  }

  return ids;
}
