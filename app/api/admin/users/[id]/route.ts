import { NextResponse } from "next/server";
import { BanReason, Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/platform/db";
import { handleAdminApiError } from "@/lib/admin/admin-api-response";
import { requireAdmin } from "@/lib/auth/auth-session";
import {
  applyUserRoleChange,
  assertRoleChangeAllowed,
} from "@/lib/auth/role-policy";
import {
  assertCanManageUser,
  hasStaffPlatformPrivileges,
  isSuperAdminRole,
} from "@/lib/auth/permissions";
import { hashPassword } from "@/lib/auth/password";
import { withApiRoute } from "@/lib/api/with-api-route";
import { setAuditDetail } from "@/lib/logger/audit";
import {
  countUserCalculators,
  getEffectiveMaxCalculators,
  isAccessActive,
} from "@/lib/access/user-limits";

const updateSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  banned: z.boolean().optional(),
  banReason: z.nativeEnum(BanReason).nullable().optional(),
  name: z.string().min(1).max(80).nullable().optional(),
  maxCalculators: z.number().int().min(0).max(1000).nullable().optional(),
  accessExpiresAt: z.string().datetime().nullable().optional(),
  adminNotes: z.string().max(500).nullable().optional(),
  password: z.string().min(8).max(128).optional(),
  email: z.string().email().optional(),
});

export const PATCH = withApiRoute(async function PATCH(
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

    if (
      id === session.user.id &&
      body.role !== undefined &&
      body.role !== session.user.role
    ) {
      return NextResponse.json({ error: "cannot_demote_self" }, { status: 400 });
    }

    const targetBefore = await db.user.findUnique({
      where: { id },
      select: { role: true },
    });
    if (!targetBefore) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const manageError = assertCanManageUser(
      session.user.role,
      targetBefore.role,
      session.user.id,
      id,
    );
    const hasUserPatch =
      body.role !== undefined ||
      body.banned !== undefined ||
      body.banReason !== undefined ||
      body.name !== undefined ||
      body.maxCalculators !== undefined ||
      body.accessExpiresAt !== undefined ||
      body.adminNotes !== undefined ||
      body.password !== undefined ||
      body.email !== undefined;

    if (hasUserPatch && manageError) {
      return NextResponse.json({ error: manageError }, { status: 403 });
    }

    if (body.banned === true && targetBefore.role === Role.SUPERADMIN) {
      return NextResponse.json({ error: "cannot_ban_superadmin" }, { status: 400 });
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
      passwordHash?: string;
      email?: string;
      issueBanDismissedAt?: null;
      issueExpiredDismissedFor?: null;
    } = {};

    if (body.role !== undefined) {
      const roleError = await assertRoleChangeAllowed(
        session.user.id,
        session.user.role,
        id,
        body.role,
      );
      if (roleError) {
        const status =
          roleError === "cannot_modify_superadmin" ? 403 : 400;
        return NextResponse.json({ error: roleError }, { status });
      }
    }
    if (body.banned !== undefined) {
      data.banned = body.banned;
      if (body.banned) {
        data.banReason = body.banReason ?? null;
        data.issueBanDismissedAt = null;
      } else {
        data.banReason = null;
        data.issueBanDismissedAt = null;
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
      data.issueExpiredDismissedFor = null;
    }
    if (body.adminNotes !== undefined) {
      data.adminNotes = body.adminNotes;
    }
    if (body.password !== undefined) {
      data.passwordHash = await hashPassword(body.password);
    }
    if (body.email !== undefined) {
      const email = body.email.toLowerCase();
      const existing = await db.user.findUnique({
        where: { email },
        select: { id: true },
      });
      if (existing && existing.id !== id) {
        return NextResponse.json({ error: "email_exists" }, { status: 409 });
      }
      data.email = email;
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

    if (body.role !== undefined && body.role !== targetBefore.role) {
      await applyUserRoleChange(id, body.role);
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

    setAuditDetail({
      target_user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
      },
      changes: {
        ...(body.role !== undefined ? { role: body.role } : {}),
        ...(body.banned !== undefined ?
          { banned: body.banned, ban_reason: user.banReason }
        : {}),
        ...(body.name !== undefined ? { name: body.name } : {}),
        ...(body.email !== undefined ? { email: user.email } : {}),
        ...(body.maxCalculators !== undefined ?
          { max_calculators: body.maxCalculators }
        : {}),
        ...(body.accessExpiresAt !== undefined ?
          { access_expires_at: body.accessExpiresAt }
        : {}),
        ...(body.password !== undefined ? { password_reset: true } : {}),
      },
    });

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
          user.maxCalculators == null &&
          !hasStaffPlatformPrivileges(user.role),
      },
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }
    return handleAdminApiError(error, "admin/users/[id]");
  }
}
);
