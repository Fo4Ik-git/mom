import {
  AiAccessMode,
  type AiTokenQuotaPeriod,
  type User,
} from "@prisma/client";
import { hasStaffPlatformPrivileges } from "@/lib/auth/staff-role";

export type AiAccessUserFields = Pick<
  User,
  | "id"
  | "role"
  | "aiAccessMode"
  | "aiAccessExpiresAt"
  | "aiAccessGrantedAt"
  | "aiAccessDurationDays"
>;

export function resolveAiAccessExpiresAt(
  user: AiAccessUserFields,
): Date | null {
  if (user.aiAccessMode === AiAccessMode.UNTIL_DATE) {
    return user.aiAccessExpiresAt;
  }
  if (
    user.aiAccessMode === AiAccessMode.DURATION &&
    user.aiAccessGrantedAt &&
    user.aiAccessDurationDays != null &&
    user.aiAccessDurationDays > 0
  ) {
    const end = new Date(user.aiAccessGrantedAt);
    end.setUTCDate(end.getUTCDate() + user.aiAccessDurationDays);
    return end;
  }
  return null;
}

export function isAiAssistantAccessActive(
  user: AiAccessUserFields,
  now = new Date(),
): boolean {
  if (user.aiAccessMode === AiAccessMode.OFF) {
    return false;
  }
  if (user.aiAccessMode === AiAccessMode.PERMANENT) {
    return true;
  }
  const expiresAt = resolveAiAccessExpiresAt(user);
  if (!expiresAt) {
    return false;
  }
  return expiresAt.getTime() > now.getTime();
}

export function hasUnlimitedAiTokens(
  user: Pick<User, "role" | "aiTokenQuota">,
): boolean {
  return hasStaffPlatformPrivileges(user.role) || user.aiTokenQuota == null;
}

export type AiAccessQuotaUserFields = AiAccessUserFields &
  Pick<User, "aiTokenQuota" | "aiTokenQuotaPeriod" | "id">;

export function effectiveAiTokenQuotaPeriod(
  user: AiAccessQuotaUserFields,
): AiTokenQuotaPeriod {
  return user.aiTokenQuotaPeriod;
}
