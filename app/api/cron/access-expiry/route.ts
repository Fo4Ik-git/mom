import { NextResponse } from "next/server";
import { runScheduledAccessExpiryCheckIfDue } from "@/lib/access-expiry-check";
import { isAuthorizedCronRequest } from "@/lib/cron-auth";

export async function GET(request: Request) {
  if (!isAuthorizedCronRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await runScheduledAccessExpiryCheckIfDue();
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  return GET(request);
}
