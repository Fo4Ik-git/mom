/** Prisma enum values — keep as strings (safe for client bundles). */
export const ACCESS_EXPIRY_CHECK_INTERVALS = [
  "OFF",
  "DAILY",
  "WEEKLY",
  "MONTHLY",
] as const;

export type AccessExpiryCheckIntervalValue =
  (typeof ACCESS_EXPIRY_CHECK_INTERVALS)[number];

export const DEFAULT_ACCESS_EXPIRY_CHECK_INTERVAL: AccessExpiryCheckIntervalValue =
  "OFF";

export function isAccessExpiryCheckInterval(
  value: string,
): value is AccessExpiryCheckIntervalValue {
  return ACCESS_EXPIRY_CHECK_INTERVALS.includes(
    value as AccessExpiryCheckIntervalValue,
  );
}
