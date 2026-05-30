import { AccessKeyKind } from "@prisma/client";
import { isReferralKeyDisplayable } from "@/lib/access/referral-key-display";
import { db } from "@/lib/platform/db";

export {
  isReferralKeyDisplayable,
  toReferralKeyDto,
  type ReferralKeyDto,
} from "@/lib/access/referral-key-display";

export async function findUserReferralKey(userId: string) {
  return db.accessKey.findFirst({
    where: {
      referrerUserId: userId,
      kind: AccessKeyKind.REFERRAL,
    },
    orderBy: { updatedAt: "desc" },
  });
}

export async function getDisplayableUserReferral(userId: string) {
  const key = await findUserReferralKey(userId);
  if (!key || !isReferralKeyDisplayable(key)) {
    return null;
  }
  return key;
}
