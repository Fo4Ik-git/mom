import { AiAccessMode, AiTokenQuotaPeriod } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  getAiUsageStatsForUser,
  getAiQuotaSnapshot,
} from "@/lib/ai/ai-quota";
import {
  isAiAssistantAccessActive,
  resolveAiAccessExpiresAt,
} from "@/lib/ai/ai-access";
import { handleAdminApiError } from "@/lib/admin/admin-api-response";
import { requireAdmin } from "@/lib/auth/auth-session";
import { getPlatformSettings } from "@/lib/platform/platform-settings";
import { db } from "@/lib/platform/db";
import { withApiRoute } from "@/lib/api/with-api-route";
import { setAuditDetail } from "@/lib/logger/audit";
import { AI_TOKEN_QUOTA_MAX } from "@/lib/ai/ai-quota-limits";

const aiUserSelect = {
  id: true,
  email: true,
  role: true,
  aiAccessMode: true,
  aiAccessExpiresAt: true,
  aiAccessGrantedAt: true,
  aiAccessDurationDays: true,
  aiTokenQuota: true,
  aiTokenQuotaPeriod: true,
} as const;

const patchSchema = z.object({
  aiAccessMode: z.nativeEnum(AiAccessMode).optional(),
  aiAccessExpiresAt: z.string().datetime().nullable().optional(),
  aiAccessDurationDays: z.number().int().min(1).max(3650).nullable().optional(),
  aiTokenQuota: z
    .number()
    .int()
    .min(0)
    .max(AI_TOKEN_QUOTA_MAX)
    .nullable()
    .optional(),
  aiTokenQuotaPeriod: z.nativeEnum(AiTokenQuotaPeriod).optional(),
  useDefaultQuota: z.boolean().optional(),
});

export const GET = withApiRoute(async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const user = await db.user.findUnique({
      where: { id },
      select: aiUserSelect,
    });

    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const [usage, quota, platform] = await Promise.all([
      getAiUsageStatsForUser(id),
      getAiQuotaSnapshot(user),
      getPlatformSettings(),
    ]);

    const accessExpiresAt = resolveAiAccessExpiresAt(user);

    return NextResponse.json({
      access: {
        mode: user.aiAccessMode,
        active: isAiAssistantAccessActive(user),
        expiresAt: accessExpiresAt?.toISOString() ?? null,
        grantedAt: user.aiAccessGrantedAt?.toISOString() ?? null,
        durationDays: user.aiAccessDurationDays,
      },
      quota: {
        limit: user.aiTokenQuota,
        period: user.aiTokenQuotaPeriod,
        unlimited: quota.unlimited,
        usedInPeriod: quota.usedInPeriod,
        remaining: quota.remaining,
        periodStart: quota.periodStart,
        periodEnd: quota.periodEnd,
      },
      usage,
      defaults: {
        aiTokenQuota: platform.defaultAiTokenQuota,
        aiTokenQuotaPeriod: platform.defaultAiTokenQuotaPeriod,
      },
    });
  } catch (error) {
    return handleAdminApiError(error, "admin/users/[id]/ai GET");
  }
});

export const PATCH = withApiRoute(async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    const existing = await db.user.findUnique({
      where: { id },
      select: aiUserSelect,
    });

    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const platform = await getPlatformSettings();
    const data: {
      aiAccessMode?: AiAccessMode;
      aiAccessExpiresAt?: Date | null;
      aiAccessGrantedAt?: Date | null;
      aiAccessDurationDays?: number | null;
      aiTokenQuota?: number | null;
      aiTokenQuotaPeriod?: AiTokenQuotaPeriod;
    } = {};

    if (body.aiAccessMode !== undefined) {
      data.aiAccessMode = body.aiAccessMode;
      if (body.aiAccessMode === AiAccessMode.OFF) {
        data.aiAccessExpiresAt = null;
        data.aiAccessGrantedAt = null;
        data.aiAccessDurationDays = null;
      } else if (body.aiAccessMode === AiAccessMode.PERMANENT) {
        data.aiAccessExpiresAt = null;
        data.aiAccessGrantedAt = null;
        data.aiAccessDurationDays = null;
      } else if (body.aiAccessMode === AiAccessMode.DURATION) {
        data.aiAccessGrantedAt = new Date();
        if (body.aiAccessDurationDays !== undefined) {
          data.aiAccessDurationDays = body.aiAccessDurationDays;
        } else if (!existing.aiAccessDurationDays) {
          data.aiAccessDurationDays = 30;
        }
        data.aiAccessExpiresAt = null;
      } else if (body.aiAccessMode === AiAccessMode.UNTIL_DATE) {
        data.aiAccessGrantedAt = null;
        data.aiAccessDurationDays = null;
      }
    }

    if (body.aiAccessExpiresAt !== undefined) {
      data.aiAccessExpiresAt = body.aiAccessExpiresAt
        ? new Date(body.aiAccessExpiresAt)
        : null;
    }

    if (body.aiAccessDurationDays !== undefined) {
      data.aiAccessDurationDays = body.aiAccessDurationDays;
    }

    if (body.useDefaultQuota === true) {
      data.aiTokenQuota = platform.defaultAiTokenQuota;
      data.aiTokenQuotaPeriod = platform.defaultAiTokenQuotaPeriod;
    } else {
      if (body.aiTokenQuota !== undefined) {
        data.aiTokenQuota = body.aiTokenQuota;
      }
      if (body.aiTokenQuotaPeriod !== undefined) {
        data.aiTokenQuotaPeriod = body.aiTokenQuotaPeriod;
      }
    }

    const user = await db.user.update({
      where: { id },
      data,
      select: aiUserSelect,
    });

    setAuditDetail({
      target_user: { id: user.id, email: user.email },
      changes: {
        ai_access_mode: user.aiAccessMode,
        ai_token_quota: user.aiTokenQuota,
        ai_token_quota_period: user.aiTokenQuotaPeriod,
      },
    });

    const quota = await getAiQuotaSnapshot(user);
    const usage = await getAiUsageStatsForUser(id);

    return NextResponse.json({
      access: {
        mode: user.aiAccessMode,
        active: isAiAssistantAccessActive(user),
        expiresAt: resolveAiAccessExpiresAt(user)?.toISOString() ?? null,
        grantedAt: user.aiAccessGrantedAt?.toISOString() ?? null,
        durationDays: user.aiAccessDurationDays,
      },
      quota: {
        limit: user.aiTokenQuota,
        period: user.aiTokenQuotaPeriod,
        unlimited: quota.unlimited,
        usedInPeriod: quota.usedInPeriod,
        remaining: quota.remaining,
        periodStart: quota.periodStart,
        periodEnd: quota.periodEnd,
      },
      usage,
      defaults: {
        aiTokenQuota: platform.defaultAiTokenQuota,
        aiTokenQuotaPeriod: platform.defaultAiTokenQuotaPeriod,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      const quotaIssue = error.issues.find((issue) =>
        issue.path.includes("aiTokenQuota"),
      );
      if (quotaIssue) {
        return NextResponse.json(
          { error: "ai_token_quota_too_high", max: AI_TOKEN_QUOTA_MAX },
          { status: 400 },
        );
      }
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }
    return handleAdminApiError(error, "admin/users/[id]/ai PATCH");
  }
});
