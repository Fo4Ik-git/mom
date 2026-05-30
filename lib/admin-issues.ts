import { Role } from "@prisma/client";

type IssueUser = {
  role: Role;
  banned: boolean;
  accessExpiresAt: Date | null;
  issueBanDismissedAt: Date | null;
  issueExpiredDismissedFor: Date | null;
};

export function isBanIssueVisible(user: IssueUser): boolean {
  return user.banned && user.issueBanDismissedAt == null;
}

export function isExpiredAccessIssueVisible(
  user: IssueUser,
  now = new Date(),
): boolean {
  const expired =
    user.role === Role.USER &&
    user.accessExpiresAt !== null &&
    user.accessExpiresAt < now;

  if (!expired) {
    return false;
  }

  if (user.issueExpiredDismissedFor == null || user.accessExpiresAt == null) {
    return true;
  }

  return (
    user.issueExpiredDismissedFor.getTime() !== user.accessExpiresAt.getTime()
  );
}
