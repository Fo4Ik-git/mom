import { randomUUID } from "node:crypto";

/** Edge-safe trace id (no AsyncLocalStorage). */
export function generateTraceId(): string {
  return randomUUID();
}
