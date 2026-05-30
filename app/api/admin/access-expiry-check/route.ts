import { NextResponse } from "next/server";
import {
  getAccessExpiryCheckStatus,
  runAccessExpiryCheck,
  runScheduledAccessExpiryCheckIfDue,
} from "@/lib/access/access-expiry-check";
import { handleAdminApiError } from "@/lib/admin/admin-api-response";
import { requireAdmin } from "@/lib/auth/auth-session";
import { withApiRoute } from "@/lib/api/with-api-route";

/** Status only — last run time and whether a scheduled run is due. */
export const GET = withApiRoute(async function GET() {
  try {
    await requireAdmin();
    const status = await getAccessExpiryCheckStatus();
    return NextResponse.json({
      ran: false,
      bannedCount: 0,
      ...status,
    });
  } catch (error) {
    return handleAdminApiError(error, "admin/access-expiry-check");
  }
});

/**
 * Runs expiry enforcement. Use POST only when the admin explicitly starts a check.
 * Optional body `{ "scheduled": true }` — run only if the interval says it is due.
 */
export const POST = withApiRoute(async function POST(request: Request) {
  try {
    await requireAdmin();

    let scheduled = false;
    try {
      const raw = await request.text();
      if (raw.trim()) {
        const body = JSON.parse(raw) as { scheduled?: boolean };
        scheduled = body.scheduled === true;
      }
    } catch {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }

    if (scheduled) {
      const result = await runScheduledAccessExpiryCheckIfDue();
      return NextResponse.json(result);
    }

    const result = await runAccessExpiryCheck();
    return NextResponse.json({
      ran: true,
      bannedCount: result.bannedCount,
      ranAt: result.ranAt.toISOString(),
    });
  } catch (error) {
    return handleAdminApiError(error, "admin/access-expiry-check");
  }
});
