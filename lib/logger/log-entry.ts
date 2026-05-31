export type LogEntry = {
  lineNumber: number;
  time?: string;
  level?: string;
  trace_id?: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  user_role?: string;
  action?: string;
  event?: string;
  http_method?: string;
  path?: string;
  status?: number;
  duration_ms?: number;
  msg?: string;
  component?: string;
  calculator_id?: string;
  target_user_id?: string;
  share_user_id?: string;
  access_key_id?: string;
  /** Parsed JSON object for detail view (full payload). */
  payload?: Record<string, unknown>;
  raw: string;
};

export function parseLogPayload(
  entry: Pick<LogEntry, "raw" | "payload">,
): Record<string, unknown> | null {
  if (entry.payload) {
    return entry.payload;
  }
  try {
    const parsed = JSON.parse(entry.raw) as unknown;
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}
