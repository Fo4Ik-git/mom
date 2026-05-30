/** Local calendar date `YYYY-MM-DD` (for comparisons and date inputs). */
export function toLocalDateKey(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Access valid through the expiry calendar day; expired from the next local day. */
export function isAccessExpiredByCalendarDay(
  accessExpiresAt: Date,
  now = new Date(),
): boolean {
  return toLocalDateKey(now) > toLocalDateKey(accessExpiresAt);
}

export function formatDateInputLocal(iso: string | null): string {
  if (!iso) {
    return "";
  }
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return "";
  }
  return toLocalDateKey(date);
}

export function formatAccessDateShort(iso: string, locale: string): string {
  return new Date(iso).toLocaleDateString(locale, {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

/** End of selected local calendar day (for saving `accessExpiresAt`). */
export function accessExpiresAtFromDateInput(dateInput: string): string {
  return new Date(`${dateInput}T23:59:59`).toISOString();
}
