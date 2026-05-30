import { AccessKeyKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleAdminApiError } from "@/lib/admin/admin-api-response";
import { db } from "@/lib/platform/db";
import { requireAdmin } from "@/lib/auth/auth-session";
import { withApiRoute } from "@/lib/api/with-api-route";

const patchSchema = z.object({
  label: z.string().max(120).nullable().optional(),
  maxUses: z.number().int().min(1).max(100_000).nullable().optional(),
  usedCount: z.number().int().min(0).max(100_000).optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  accessDays: z.number().int().min(0).max(3650).nullable().optional(),
  referrerBonusDays: z.number().int().min(0).max(3650).nullable().optional(),
  active: z.boolean().optional(),
  kind: z.nativeEnum(AccessKeyKind).optional(),
});

export const PATCH = withApiRoute(async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    const existing = await db.accessKey.findUnique({ where: { id } });
    if (!existing) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const data: {
      label?: string | null;
      maxUses?: number | null;
      usedCount?: number;
      expiresAt?: Date | null;
      accessDays?: number | null;
      referrerBonusDays?: number | null;
      active?: boolean;
      kind?: AccessKeyKind;
    } = {};

    if (body.label !== undefined) {
      data.label = body.label;
    }
    if (body.maxUses !== undefined) {
      data.maxUses = body.maxUses;
      const usedCount = body.usedCount ?? existing.usedCount;
      if (body.maxUses != null && usedCount > body.maxUses) {
        return NextResponse.json({ error: "used_count_exceeds_max" }, { status: 400 });
      }
    }
    if (body.usedCount !== undefined) {
      const maxUses = body.maxUses ?? existing.maxUses;
      if (maxUses != null && body.usedCount > maxUses) {
        return NextResponse.json({ error: "used_count_exceeds_max" }, { status: 400 });
      }
      data.usedCount = body.usedCount;
    }
    if (body.expiresAt !== undefined) {
      data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    }
    if (body.accessDays !== undefined) {
      data.accessDays = body.accessDays;
    }
    if (body.referrerBonusDays !== undefined) {
      data.referrerBonusDays = body.referrerBonusDays;
    }
    if (body.active !== undefined) {
      data.active = body.active;
    }
    if (body.kind !== undefined) {
      data.kind = body.kind;
    }

    const key = await db.accessKey.update({
      where: { id },
      data,
    });

    return NextResponse.json({
      key: {
        id: key.id,
        code: key.code,
        active: key.active,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }
    return handleAdminApiError(error, "admin/access-keys/[id] PATCH");
  }
}
);

export const DELETE = withApiRoute(async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    await db.accessKey.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAdminApiError(error, "admin/access-keys/[id] DELETE");
  }
}
);
