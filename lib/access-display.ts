export function getDaysUntilExpiry(accessExpiresAt: string): number {
  const expires = new Date(accessExpiresAt).getTime();
  const now = Date.now();
  return Math.ceil((expires - now) / (24 * 60 * 60 * 1000));
}

export function formatAccessDate(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}
