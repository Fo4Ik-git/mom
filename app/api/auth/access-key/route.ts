import { NextResponse } from "next/server";
import { inspectAccessKey } from "@/lib/access/access-keys";
import { isAllowedFrontendRequest } from "@/lib/api/api-security";
import { withApiRoute } from "@/lib/api/with-api-route";

export const GET = withApiRoute(async function GET(request: Request) {
  if (!isAllowedFrontendRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const code = new URL(request.url).searchParams.get("code")?.trim() ?? "";
  if (!code) {
    return NextResponse.json({ valid: false, reason: "invalid" });
  }

  const result = await inspectAccessKey(code);
  return NextResponse.json(result);
}
);
