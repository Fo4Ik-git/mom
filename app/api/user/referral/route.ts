import { NextResponse } from "next/server";
import { ensureAdminReferralKey } from "@/lib/access/ensure-admin-referral";
import { isStaffRole } from "@/lib/auth/staff-role";
import { resolveReferrerBonusDays } from "@/lib/access/referrer-reward";
import { getDisplayableUserReferral } from "@/lib/access/user-referral";
import { getPlatformSettings } from "@/lib/platform/platform-settings";
import { signupPathWithKey } from "@/lib/auth/signup-url";
import { requireAuth } from "@/lib/auth/auth-session";
import { db } from "@/lib/platform/db";
import { withApiRoute } from "@/lib/api/with-api-route";

export const GET = withApiRoute(async function GET() {
  try {
    const session = await requireAuth();
    const dbUser = await db.user.findUnique({
      where: { id: session.user.id },
      select: { role: true },
    });
    if (dbUser && isStaffRole(dbUser.role)) {
      await ensureAdminReferralKey(session.user.id, dbUser.role);
    }
    const key = await getDisplayableUserReferral(session.user.id);

    if (!key) {
      return NextResponse.json({ referral: null });
    }

    const usesLeft =
      key.maxUses != null ? Math.max(0, key.maxUses - key.usedCount) : null;

    const platform = await getPlatformSettings();
    const referrerBonusDays = resolveReferrerBonusDays(
      key,
      platform.defaultReferrerBonusDays,
    );

    return NextResponse.json({
      referral: {
        code: key.code,
        signupPath: signupPathWithKey(key.code),
        label: key.label,
        maxUses: key.maxUses,
        usedCount: key.usedCount,
        usesLeft,
        expiresAt: key.expiresAt?.toISOString() ?? null,
        referrerBonusDays,
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
});
