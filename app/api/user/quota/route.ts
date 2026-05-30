import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth/auth-session";
import { getUserQuota } from "@/lib/access/user-limits";
import { withApiRoute } from "@/lib/api/with-api-route";

export const GET = withApiRoute(async function GET() {
  try {
    const session = await requireAuth();
    const quota = await getUserQuota(session.user.id);
    return NextResponse.json(quota);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
);
