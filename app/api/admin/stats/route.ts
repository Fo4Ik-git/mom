import { NextResponse } from "next/server";
import {
  getAdminAnalytics,
  type AnalyticsRange,
} from "@/lib/admin-analytics";
import { handleAdminApiError } from "@/lib/admin-api-response";
import { requireAdmin } from "@/lib/auth-session";

const RANGES = new Set<AnalyticsRange>(["24h", "7d", "30d", "90d"]);

function parseRange(value: string | null): AnalyticsRange {
  if (value && RANGES.has(value as AnalyticsRange)) {
    return value as AnalyticsRange;
  }
  return "7d";
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const range = parseRange(searchParams.get("range"));
    const locale = searchParams.get("locale") ?? "uk-UA";

    const analytics = await getAdminAnalytics(range, locale);

    return NextResponse.json(analytics);
  } catch (error) {
    return handleAdminApiError(error, "admin/stats");
  }
}
