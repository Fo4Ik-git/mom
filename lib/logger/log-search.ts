/** Collects all scalar values from a log JSON object for unified search. */
export function buildLogSearchBlob(value: unknown): string {
  const parts: string[] = [];
  collectSearchableParts(value, parts);
  return parts.join("\u0001").toLowerCase();
}

function collectSearchableParts(value: unknown, out: string[]): void {
  if (value === null || value === undefined) {
    return;
  }
  if (
    typeof value === "string" ||
    typeof value === "number" ||
    typeof value === "boolean"
  ) {
    const text = String(value).trim();
    if (text) {
      out.push(text);
    }
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      collectSearchableParts(item, out);
    }
    return;
  }
  if (typeof value === "object") {
    for (const part of Object.values(value as Record<string, unknown>)) {
      collectSearchableParts(part, out);
    }
  }
}

export function matchesLogSearch(blob: string, needle: string): boolean {
  const q = needle.trim().toLowerCase();
  if (!q) {
    return true;
  }
  return blob.includes(q);
}

/** Merges legacy trace_id param into general query. */
export function mergeLogSearchQuery(
  q?: string,
  traceId?: string,
): string | undefined {
  const parts = [q?.trim(), traceId?.trim()].filter(Boolean);
  if (parts.length === 0) {
    return undefined;
  }
  return parts.join(" ");
}
