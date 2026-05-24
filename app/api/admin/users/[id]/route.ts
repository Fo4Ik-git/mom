import { NextResponse } from "next/server";
import { BanReason, Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { handleAdminApiError } from "@/lib/admin-api-response";
import { requireAdmin } from "@/lib/auth-session";
import {
  countUserCalculators,
  getEffectiveMaxCalculators,
  isAccessActive,
} from "@/lib/user-limits";

const updateSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  banned: z.boolean().optional(),
  banReason: z.nativeEnum(BanReason).nullable().optional(),
  name: z.string().min(1).max(80).nullable().optional(),
  maxCalculators: z.number().int().min(0).max(1000).nullable().optional(),
  accessExpiresAt: z.string().datetime().nullable().optional(),
  adminNotes: z.string().max(500).nullable().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = updateSchema.parse(await request.json());

    if (id === session.user.id && body.banned === true) {
      return NextResponse.json({ error: "cannot_ban_self" }, { status: 400 });
    }

    if (id === session.user.id && body.role === Role.USER) {
      return NextResponse.json({ error: "cannot_demote_self" }, { status: 400 });
    }

    if (body.banned === true && !body.banReason) {
      return NextResponse.json({ error: "ban_reason_required" }, { status: 400 });
    }

    const data: {
      role?: Role;
      banned?: boolean;
      banReason?: BanReason | null;
      name?: string | null;
      maxCalculators?: number | null;
      accessExpiresAt?: Date | null;
      adminNotes?: string | null;
    } = {};

    if (body.role !== undefined) {
      data.role = body.role;
    }
    if (body.banned !== undefined) {
      data.banned = body.banned;
      if (body.banned) {
        data.banReason = body.banReason ?? null;
      } else {
        data.banReason = null;
      }
    } else if (body.banReason !== undefined) {
      data.banReason = body.banReason;
    }
    if (body.name !== undefined) {
      data.name = body.name;
    }
    if (body.maxCalculators !== undefined) {
      data.maxCalculators = body.maxCalculators;
    }
    if (body.accessExpiresAt !== undefined) {
      data.accessExpiresAt = body.accessExpiresAt
        ? new Date(body.accessExpiresAt)
        : null;
    }
    if (body.adminNotes !== undefined) {
      data.adminNotes = body.adminNotes;
    }

    if (body.accessExpiresAt !== undefined) {
      const extendedAccess =
        body.accessExpiresAt === null ||
        new Date(body.accessExpiresAt).getTime() > Date.now();

      if (extendedAccess) {
        const current = await db.user.findUnique({
          where: { id },
          select: { banned: true, banReason: true },
        });

        if (
          current?.banned &&
          current.banReason === BanReason.ACCESS_EXPIRED
        ) {
          data.banned = false;
          data.banReason = null;
        }
      }
    }

    const user = await db.user.update({
      where: { id },
      data,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        banned: true,
        banReason: true,
        maxCalculators: true,
        accessExpiresAt: true,
        adminNotes: true,
        createdAt: true,
      },
    });

    const calculatorsCount = await countUserCalculators(user.id);
    const effectiveMaxCalculators = await getEffectiveMaxCalculators(user);

    return NextResponse.json({
      user: {
        ...user,
        banReason: user.banReason,
        accessExpiresAt: user.accessExpiresAt?.toISOString() ?? null,
        accessActive: isAccessActive(user),
        createdAt: user.createdAt.toISOString(),
        calculatorsCount,
        effectiveMaxCalculators,
        usesDefaultLimit:
          user.maxCalculators == null && user.role !== Role.ADMIN,
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }
    return handleAdminApiError(error, "admin/users/[id]");
  }
}
