import { NextResponse } from "next/server";
import { runScheduledAccessExpiryCheckIfDue } from "@/lib/access/access-expiry-check";
import { isAuthorizedCronRequest } from "@/lib/api/cron-auth";
import { withApiRoute } from "@/lib/api/with-api-route";

async function handleAccessExpiry(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runScheduledAccessExpiryCheckIfDue();
  return NextResponse.json(result);
}

export const GET = withApiRoute(handleAccessExpiry);
export const POST = withApiRoute(handleAccessExpiry);
