import { AccessKeyKind, Prisma } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  createAccessKey,
  normalizeAccessKeyCode,
} from "@/lib/access/access-keys";
import {
  findUserReferralKey,
  toReferralKeyDto,
} from "@/lib/access/user-referral";
import { handleAdminApiError } from "@/lib/admin/admin-api-response";
import { requireAdmin } from "@/lib/auth/auth-session";
import { assertCanManageUser } from "@/lib/auth/permissions";
import { db } from "@/lib/platform/db";
import { withApiRoute } from "@/lib/api/with-api-route";

const upsertSchema = z.object({
  granted: z.boolean(),
  code: z.string().min(4).max(32).optional(),
  label: z.string().max(120).nullable().optional(),
  maxUses: z.number().int().min(1).max(100_000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  accessDays: z.number().int().min(0).max(3650).nullable().optional(),
  referrerBonusDays: z.number().int().min(0).max(3650).nullable().optional(),
  active: z.boolean().optional(),
});

export const GET = withApiRoute(async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id: userId } = await params;

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const key = await findUserReferralKey(userId);
    return NextResponse.json({
      granted: key != null,
      referral: key ? toReferralKeyDto(key) : null,
    });
  } catch (error) {
    return handleAdminApiError(error, "admin/users/[id]/referral GET");
  }
});

export const PUT = withApiRoute(async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id: userId } = await params;
    const body = upsertSchema.parse(await request.json());

    const user = await db.user.findUnique({
      where: { id: userId },
      select: { id: true, role: true },
    });
    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const manageError = assertCanManageUser(
      session.user.role,
      user.role,
      session.user.id,
      userId,
    );
    if (manageError) {
      return NextResponse.json({ error: manageError }, { status: 403 });
    }

    if (!body.granted) {
      await db.accessKey.deleteMany({
        where: { referrerUserId: userId, kind: AccessKeyKind.REFERRAL },
      });
      return NextResponse.json({ granted: false, referral: null });
    }

    const existing = await findUserReferralKey(userId);
    const normalizedCode = body.code
      ? normalizeAccessKeyCode(body.code)
      : undefined;

    if (normalizedCode === "") {
      return NextResponse.json({ error: "invalid_code" }, { status: 400 });
    }

    if (existing) {
      if (body.maxUses != null && body.maxUses < existing.usedCount) {
        return NextResponse.json(
          { error: "max_uses_below_used" },
          { status: 400 },
        );
      }

      try {
        const updated = await db.accessKey.update({
          where: { id: existing.id },
          data: {
            ...(normalizedCode !== undefined ? { code: normalizedCode } : {}),
            ...(body.label !== undefined ? { label: body.label } : {}),
            ...(body.maxUses !== undefined ? { maxUses: body.maxUses } : {}),
            ...(body.expiresAt !== undefined
              ? { expiresAt: body.expiresAt ? new Date(body.expiresAt) : null }
              : {}),
            ...(body.accessDays !== undefined
              ? { accessDays: body.accessDays }
              : {}),
            ...(body.referrerBonusDays !== undefined
              ? { referrerBonusDays: body.referrerBonusDays }
              : {}),
            ...(body.active !== undefined ? { active: body.active } : {}),
          },
        });

        return NextResponse.json({
          granted: true,
          referral: toReferralKeyDto(updated),
        });
      } catch (error) {
        if (
          error instanceof Prisma.PrismaClientKnownRequestError &&
          error.code === "P2002"
        ) {
          return NextResponse.json({ error: "code_exists" }, { status: 409 });
        }
        throw error;
      }
    }

    const key = await createAccessKey({
      kind: AccessKeyKind.REFERRAL,
      referrerUserId: userId,
      code: normalizedCode,
      label: body.label ?? null,
      maxUses: body.maxUses ?? null,
      expiresAt: body.expiresAt ? new Date(body.expiresAt) : null,
      accessDays: body.accessDays ?? null,
      referrerBonusDays: body.referrerBonusDays ?? null,
      active: body.active ?? true,
    });

    return NextResponse.json({
      granted: true,
      referral: toReferralKeyDto(key),
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      return NextResponse.json({ error: "code_exists" }, { status: 409 });
    }
    return handleAdminApiError(error, "admin/users/[id]/referral PUT");
  }
});
