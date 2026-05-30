export function normalizeAccessKeyCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}
