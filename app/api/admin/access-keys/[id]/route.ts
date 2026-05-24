import { AccessKeyKind } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { handleAdminApiError } from "@/lib/admin-api-response";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-session";

const patchSchema = z.object({
  label: z.string().max(120).nullable().optional(),
  maxUses: z.number().int().min(1).max(100_000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  accessDays: z.number().int().min(0).max(3650).nullable().optional(),
  active: z.boolean().optional(),
  kind: z.nativeEnum(AccessKeyKind).optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    const data: {
      label?: string | null;
      maxUses?: number | null;
      expiresAt?: Date | null;
      accessDays?: number | null;
      active?: boolean;
      kind?: AccessKeyKind;
    } = {};

    if (body.label !== undefined) {
      data.label = body.label;
    }
    if (body.maxUses !== undefined) {
      data.maxUses = body.maxUses;
    }
    if (body.expiresAt !== undefined) {
      data.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    }
    if (body.accessDays !== undefined) {
      data.accessDays = body.accessDays;
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

export async function DELETE(
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
