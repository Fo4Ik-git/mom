import { AccessKeyKind, type AccessKey, type User } from "@prisma/client";
import { hasStaffPlatformPrivileges } from "@/lib/auth/staff-role";
import {
  extendAccessExpiresAt,
  resolveReferrerBonusDays,
} from "@/lib/access/referrer-bonus";
import { getPlatformSettings } from "@/lib/platform/platform-settings";

export { extendAccessExpiresAt, resolveReferrerBonusDays } from "@/lib/access/referrer-bonus";

export async function applyReferrerSignupReward(
  key: Pick<
    AccessKey,
    "kind" | "referrerUserId" | "referrerBonusDays"
  >,
  updateReferrer: (data: { accessExpiresAt: Date | null }) => Promise<unknown>,
  loadReferrer: () => Promise<Pick<User, "role" | "accessExpiresAt"> | null>,
): Promise<number> {
  if (key.kind !== AccessKeyKind.REFERRAL || !key.referrerUserId) {
    return 0;
  }

  const platform = await getPlatformSettings();
  const bonusDays = resolveReferrerBonusDays(
    key,
    platform.defaultReferrerBonusDays,
  );
  if (bonusDays <= 0) {
    return 0;
  }

  const referrer = await loadReferrer();
  if (
    !referrer ||
    hasStaffPlatformPrivileges(referrer.role) ||
    referrer.accessExpiresAt === null
  ) {
    return 0;
  }

  const next = extendAccessExpiresAt(referrer.accessExpiresAt, bonusDays);
  if (
    next?.getTime() === referrer.accessExpiresAt?.getTime() &&
    referrer.accessExpiresAt != null
  ) {
    return 0;
  }

  await updateReferrer({ accessExpiresAt: next });
  return bonusDays;
}
