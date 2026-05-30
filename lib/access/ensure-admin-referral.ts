import { AccessKeyKind, Role } from "@prisma/client";
import { createAccessKey } from "@/lib/access/access-keys";
import { findUserReferralKey } from "@/lib/access/user-referral";
import { db } from "@/lib/platform/db";

/** Admins always have an active referral with no use/expiry limits. */
export async function ensureAdminReferralKey(userId: string, role: Role) {
  if (role !== Role.ADMIN) {
    return null;
  }

  const existing = await findUserReferralKey(userId);
  if (!existing) {
    return createAccessKey({
      kind: AccessKeyKind.REFERRAL,
      referrerUserId: userId,
      maxUses: null,
      expiresAt: null,
      accessDays: null,
      active: true,
      label: null,
    });
  }

  if (
    existing.maxUses != null ||
    existing.expiresAt != null ||
    !existing.active
  ) {
    return db.accessKey.update({
      where: { id: existing.id },
      data: {
        maxUses: null,
        expiresAt: null,
        active: true,
      },
    });
  }

  return existing;
}
