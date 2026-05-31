import { NextResponse } from "next/server";
import { getAiQuotaSnapshot } from "@/lib/ai/ai-quota";
import { requireAuth } from "@/lib/auth/auth-session";
import { db } from "@/lib/platform/db";
import { withApiRoute } from "@/lib/api/with-api-route";

export const GET = withApiRoute(async function GET() {
  try {
    const session = await requireAuth();
    const user = await db.user.findUnique({
      where: { id: session.user.id },
      select: {
        id: true,
        role: true,
        aiAccessMode: true,
        aiAccessExpiresAt: true,
        aiAccessGrantedAt: true,
        aiAccessDurationDays: true,
        aiTokenQuota: true,
        aiTokenQuotaPeriod: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const quota = await getAiQuotaSnapshot(user);
    return NextResponse.json(quota);
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
});
