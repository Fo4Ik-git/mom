import { AccessKeyKind, type AccessKey } from "@prisma/client";

export type ReferralKeyDto = {
  id: string;
  code: string;
  label: string | null;
  maxUses: number | null;
  usedCount: number;
  expiresAt: string | null;
  accessDays: number | null;
  referrerBonusDays: number | null;
  active: boolean;
  displayable: boolean;
};

export function isReferralKeyDisplayable(key: AccessKey): boolean {
  if (!key.active || key.kind !== AccessKeyKind.REFERRAL) {
    return false;
  }
  if (key.expiresAt && key.expiresAt.getTime() <= Date.now()) {
    return false;
  }
  if (key.maxUses != null && key.usedCount >= key.maxUses) {
    return false;
  }
  return true;
}

export function toReferralKeyDto(key: AccessKey): ReferralKeyDto {
  return {
    id: key.id,
    code: key.code,
    label: key.label,
    maxUses: key.maxUses,
    usedCount: key.usedCount,
    expiresAt: key.expiresAt?.toISOString() ?? null,
    accessDays: key.accessDays,
    referrerBonusDays: key.referrerBonusDays,
    active: key.active,
    displayable: isReferralKeyDisplayable(key),
  };
}
