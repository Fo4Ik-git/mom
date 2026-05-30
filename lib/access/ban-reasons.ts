import { BanReason } from "@prisma/client";

export const BAN_REASON_CODES = [BanReason.ACCESS_EXPIRED] as const;

export function isBanReason(value: string): value is BanReason {
  return BAN_REASON_CODES.includes(value as BanReason);
}

export function banReasonI18nKey(reason: BanReason): string {
  return `banReason_${reason}`;
}
