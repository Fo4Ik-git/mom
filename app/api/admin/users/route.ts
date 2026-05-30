import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/platform/db";
import {
  buildAdminUsersSearchWhere,
  parseAdminUsersPage,
  parseAdminUsersPageSize,
} from "@/lib/admin/admin-users-list";
import { handleAdminApiError } from "@/lib/admin/admin-api-response";
import { requireAdmin } from "@/lib/auth/auth-session";
import { hashPassword } from "@/lib/auth/password";
import { resolveDefaultAccessExpiresAt } from "@/lib/access/access-keys";
import { getPlatformSettings } from "@/lib/platform/platform-settings";
import {
  countUserCalculators,
  getEffectiveMaxCalculators,
  isAccessActive,
} from "@/lib/access/user-limits";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80).optional(),
  role: z.nativeEnum(Role).optional(),
  maxCalculators: z.number().int().min(0).max(1000).nullable().optional(),
  accessExpiresAt: z.string().datetime().nullable().optional(),
  adminNotes: z.string().max(500).optional(),
});

const userSelect = {
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
} as const;

async function mapUserRow(
  user: {
    id: string;
    email: string;
    name: string | null;
    role: Role;
    banned: boolean;
    banReason: "ACCESS_EXPIRED" | null;
    maxCalculators: number | null;
    accessExpiresAt: Date | null;
    adminNotes: string | null;
    createdAt: Date;
  },
) {
  const max = await getEffectiveMaxCalculators(user);
  const calculatorsCount = await countUserCalculators(user.id);
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    banned: user.banned,
    banReason: user.banReason,
    maxCalculators: user.maxCalculators,
    effectiveMaxCalculators: max,
    accessExpiresAt: user.accessExpiresAt?.toISOString() ?? null,
    accessActive: isAccessActive(user),
    adminNotes: user.adminNotes,
    createdAt: user.createdAt.toISOString(),
    calculatorsCount,
    usesDefaultLimit: user.maxCalculators == null && user.role !== Role.ADMIN,
  };
}

export async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const page = parseAdminUsersPage(searchParams.get("page"));
    const pageSize = parseAdminUsersPageSize(searchParams.get("pageSize"));
    const where = buildAdminUsersSearchWhere(q);
    const skip = (page - 1) * pageSize;

    const [total, users, platform] = await Promise.all([
      db.user.count({ where }),
      db.user.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        select: userSelect,
      }),
      getPlatformSettings(),
    ]);

    const rows = await Promise.all(users.map(mapUserRow));
    const totalPages = Math.max(1, Math.ceil(total / pageSize));
    const safePage = Math.min(page, totalPages);

    return NextResponse.json({
      users: rows,
      defaultMaxCalculators: platform.defaultMaxCalculators,
      pagination: {
        page: safePage,
        pageSize,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return handleAdminApiError(error, "admin/users GET");
  }
}

export async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = createSchema.parse(await request.json());
    const email = body.email.toLowerCase();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: "email_exists" }, { status: 409 });
    }

    const passwordHash = await hashPassword(body.password);
    const accessExpiresAt = body.accessExpiresAt
      ? new Date(body.accessExpiresAt)
      : await resolveDefaultAccessExpiresAt();

    const user = await db.user.create({
      data: {
        email,
        name: body.name,
        passwordHash,
        emailVerified: new Date(),
        role: body.role ?? Role.USER,
        maxCalculators: body.maxCalculators ?? undefined,
        accessExpiresAt,
        adminNotes: body.adminNotes,
      },
      select: userSelect,
    });

    const row = await mapUserRow(user);

    return NextResponse.json({ user: row }, { status: 201 });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }
    return handleAdminApiError(error, "admin/users POST");
  }
}
