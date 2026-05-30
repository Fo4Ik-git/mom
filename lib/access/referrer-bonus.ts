import type { AccessKey } from "@prisma/client";

/** Extend limited access by bonus days from base date (now if expired). Unlimited stays null. */
export function extendAccessExpiresAt(
  accessExpiresAt: Date | null,
  bonusDays: number,
  now = new Date(),
): Date | null {
  if (bonusDays <= 0 || accessExpiresAt === null) {
    return accessExpiresAt;
  }
  const base =
    accessExpiresAt.getTime() > now.getTime() ? accessExpiresAt : now;
  const next = new Date(base);
  next.setDate(next.getDate() + bonusDays);
  return next;
}

export function resolveReferrerBonusDays(
  key: Pick<AccessKey, "referrerBonusDays">,
  platformDefault: number,
): number {
  if (key.referrerBonusDays != null) {
    return key.referrerBonusDays;
  }
  return platformDefault;
}
