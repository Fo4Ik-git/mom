const SENSITIVE_KEY =
  /^(password|passwd|secret|token|authorization|cookie|api[_-]?key|access[_-]?key|refresh[_-]?token|id[_-]?token|session|credential)$/i;

const MAX_STRING_LEN = 8_000;
const MAX_ARRAY_ITEMS = 100;
const MAX_OBJECT_KEYS = 200;
const MAX_DEPTH = 12;

export type HttpPayloadLog = Record<string, unknown>;

function parseQueryString(search: string): HttpPayloadLog | undefined {
  const raw = search.startsWith("?") ? search.slice(1) : search;
  if (!raw) {
    return undefined;
  }
  const params = new URLSearchParams(raw);
  const out: HttpPayloadLog = {};
  for (const [key, value] of params.entries()) {
    const existing = out[key];
    if (existing === undefined) {
      out[key] = value;
    } else if (Array.isArray(existing)) {
      existing.push(value);
    } else {
      out[key] = [String(existing), value];
    }
  }
  return Object.keys(out).length > 0 ? out : undefined;
}

function tryParseJson(text: string): unknown {
  const trimmed = text.trim();
  if (!trimmed) {
    return undefined;
  }
  try {
    return JSON.parse(trimmed) as unknown;
  } catch {
    return trimmed.length > MAX_STRING_LEN
      ? `${trimmed.slice(0, MAX_STRING_LEN)}…`
      : trimmed;
  }
}

/** Redacts secrets and caps size for log lines. */
export function sanitizeForLog(value: unknown, depth = 0): unknown {
  if (value === null || value === undefined) {
    return value;
  }
  if (depth > MAX_DEPTH) {
    return "[max depth]";
  }
  if (typeof value === "string") {
    return value.length > MAX_STRING_LEN
      ? `${value.slice(0, MAX_STRING_LEN)}…`
      : value;
  }
  if (typeof value === "number" || typeof value === "boolean") {
    return value;
  }
  if (Array.isArray(value)) {
    const items = value
      .slice(0, MAX_ARRAY_ITEMS)
      .map((item) => sanitizeForLog(item, depth + 1));
    if (value.length > MAX_ARRAY_ITEMS) {
      items.push(`… +${value.length - MAX_ARRAY_ITEMS} more`);
    }
    return items;
  }
  if (typeof value === "object") {
    const row = value as Record<string, unknown>;
    const out: HttpPayloadLog = {};
    const keys = Object.keys(row).slice(0, MAX_OBJECT_KEYS);
    for (const key of keys) {
      if (key === "status" && row[key] && typeof row[key] === "object") {
        const st = row[key] as Record<string, unknown>;
        out.status = {
          ...(typeof st.module === "string" ? { module: st.module } : {}),
          ...(typeof st.code === "number" ? { code: st.code } : {}),
        };
        continue;
      }
      out[key] =
        SENSITIVE_KEY.test(key) ? "[redacted]" : (
          sanitizeForLog(row[key], depth + 1)
        );
    }
    if (Object.keys(row).length > MAX_OBJECT_KEYS) {
      out._truncated_keys = Object.keys(row).length - MAX_OBJECT_KEYS;
    }
    return out;
  }
  return String(value);
}

/** Incoming data: query for GET/HEAD, JSON/text body for mutations. */
export async function captureRequestLog(
  request: Request,
): Promise<HttpPayloadLog | undefined> {
  const method = request.method.toUpperCase();
  const url = new URL(request.url);

  if (method === "GET" || method === "HEAD" || method === "OPTIONS") {
    const query = parseQueryString(url.search);
    return query ? { query: sanitizeForLog(query) } : undefined;
  }

  const contentType = request.headers.get("content-type") ?? "";
  const contentLength = Number(request.headers.get("content-length") ?? "0");
  if (contentLength === 0 && !contentType) {
    return undefined;
  }

  try {
    const text = await request.clone().text();
    if (!text.trim()) {
      return undefined;
    }
    const parsed =
      contentType.includes("application/json") ?
        tryParseJson(text)
      : text.length > MAX_STRING_LEN
        ? `${text.slice(0, MAX_STRING_LEN)}…`
        : text;

    return { body: sanitizeForLog(parsed) };
  } catch {
    return { body: "[unreadable]" };
  }
}

/** Outgoing JSON (or text) from the handler response. */
export async function captureResponseLog(
  response: Response,
): Promise<HttpPayloadLog | undefined> {
  if (response.status === 204 || response.status === 304) {
    return undefined;
  }

  const contentType = response.headers.get("content-type") ?? "";
  try {
    if (contentType.includes("application/json")) {
      const payload = await response.clone().json();
      return { body: sanitizeForLog(payload) };
    }
    const text = await response.clone().text();
    if (!text.trim()) {
      return undefined;
    }
    return {
      body: sanitizeForLog(
        text.length > MAX_STRING_LEN ? `${text.slice(0, MAX_STRING_LEN)}…` : text,
      ),
    };
  } catch {
    return { body: "[unreadable]" };
  }
}
