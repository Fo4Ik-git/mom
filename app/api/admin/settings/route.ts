import { NextResponse } from "next/server";
import { z } from "zod";
import {
  ACCESS_EXPIRY_CHECK_INTERVALS,
  isAccessExpiryCheckInterval,
} from "@/lib/access/access-expiry-interval";
import {
  getPlatformSettings,
  updatePlatformSettings,
} from "@/lib/platform/platform-settings";
import { handleAdminApiError } from "@/lib/admin/admin-api-response";
import { requireAdmin } from "@/lib/auth/auth-session";
import { withApiRoute } from "@/lib/api/with-api-route";
import { setAuditDetail } from "@/lib/logger/audit";

const updateSchema = z.object({
  defaultMaxCalculators: z.number().int().min(0).max(1000),
  defaultAccessDays: z.number().int().min(0).max(3650),
  defaultReferrerBonusDays: z.number().int().min(0).max(3650).optional(),
  supportEmail: z.string().email().nullable().optional(),
  supportTelegram: z.string().max(80).nullable().optional(),
  accessExpiryCheckInterval: z
    .string()
    .refine(isAccessExpiryCheckInterval)
    .optional(),
});

function serializeAccessExpirySettings(
  settings: Awaited<ReturnType<typeof getPlatformSettings>>,
) {
  return {
    accessExpiryCheckInterval: settings.accessExpiryCheckInterval,
    accessExpiryCheckLastRunAt:
      settings.accessExpiryCheckLastRunAt?.toISOString() ?? null,
  };
}

export const GET = withApiRoute(async function GET() {
  try {
    await requireAdmin();
    const settings = await getPlatformSettings();
    return NextResponse.json({
      defaultMaxCalculators: settings.defaultMaxCalculators,
      defaultAccessDays: settings.defaultAccessDays,
      defaultReferrerBonusDays: settings.defaultReferrerBonusDays,
      supportEmail: settings.supportEmail,
      supportTelegram: settings.supportTelegram,
      updatedAt: settings.updatedAt.toISOString(),
      accessExpiryCheckIntervals: ACCESS_EXPIRY_CHECK_INTERVALS,
      ...serializeAccessExpirySettings(settings),
    });
  } catch (error) {
    return handleAdminApiError(error, "admin/settings GET");
  }
}
);

export const PATCH = withApiRoute(async function PATCH(request: Request) {
  try {
    await requireAdmin();
    const body = updateSchema.parse(await request.json());
    const settings = await updatePlatformSettings(body);
    setAuditDetail({
      changes: {
        default_max_calculators: body.defaultMaxCalculators,
        default_access_days: body.defaultAccessDays,
        ...(body.defaultReferrerBonusDays !== undefined ?
          { default_referrer_bonus_days: body.defaultReferrerBonusDays }
        : {}),
        ...(body.supportEmail !== undefined ?
          { support_email: body.supportEmail }
        : {}),
        ...(body.supportTelegram !== undefined ?
          { support_telegram: body.supportTelegram }
        : {}),
        ...(body.accessExpiryCheckInterval !== undefined ?
          { access_expiry_check_interval: body.accessExpiryCheckInterval }
        : {}),
      },
    });
    return NextResponse.json({
      defaultMaxCalculators: settings.defaultMaxCalculators,
      defaultAccessDays: settings.defaultAccessDays,
      defaultReferrerBonusDays: settings.defaultReferrerBonusDays,
      supportEmail: settings.supportEmail,
      supportTelegram: settings.supportTelegram,
      updatedAt: settings.updatedAt.toISOString(),
      ...serializeAccessExpirySettings(settings),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }
    return handleAdminApiError(error, "admin/settings PATCH");
  }
}
);
