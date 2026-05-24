import { NextResponse } from "next/server";
import { z } from "zod";
import {
  runAccessExpiryCheck,
  runScheduledAccessExpiryCheckIfDue,
} from "@/lib/access-expiry-check";
import { handleAdminApiError } from "@/lib/admin-api-response";
import { requireAdmin } from "@/lib/auth-session";

const bodySchema = z.object({
  scheduled: z.boolean().optional(),
});

export async function POST(request: Request) {
  try {
    await requireAdmin();

    let scheduled = false;
    try {
      const raw = await request.text();
      if (raw.trim()) {
        scheduled = bodySchema.parse(JSON.parse(raw)).scheduled ?? false;
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
}
