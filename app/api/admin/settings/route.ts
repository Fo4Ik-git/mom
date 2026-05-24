import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getPlatformSettings,
  updatePlatformSettings,
} from "@/lib/platform-settings";
import { handleAdminApiError } from "@/lib/admin-api-response";
import { requireAdmin } from "@/lib/auth-session";

const updateSchema = z.object({
  defaultMaxCalculators: z.number().int().min(0).max(1000),
  defaultAccessDays: z.number().int().min(0).max(3650),
});

export async function GET() {
  try {
    await requireAdmin();
    const settings = await getPlatformSettings();
    return NextResponse.json({
      defaultMaxCalculators: settings.defaultMaxCalculators,
      defaultAccessDays: settings.defaultAccessDays,
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error) {
    return handleAdminApiError(error, "admin/settings GET");
  }
}

export async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = updateSchema.parse(await request.json());
    const settings = await updatePlatformSettings(body);
    return NextResponse.json({
      defaultMaxCalculators: settings.defaultMaxCalculators,
      defaultAccessDays: settings.defaultAccessDays,
      updatedAt: settings.updatedAt.toISOString(),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }
    return handleAdminApiError(error, "admin/settings PATCH");
  }
}
