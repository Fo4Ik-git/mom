import { NextResponse } from "next/server";
import { requireAuth } from "@/lib/auth-session";
import { getUserQuota } from "@/lib/user-limits";

export async function GET() {
  try {
    const session = await requireAuth();
    const quota = await getUserQuota(session.user.id);
    return NextResponse.json(quota);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
