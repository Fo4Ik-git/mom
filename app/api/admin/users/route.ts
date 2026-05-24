import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { handleAdminApiError } from "@/lib/admin-api-response";
import { requireAdmin } from "@/lib/auth-session";
import { hashPassword } from "@/lib/password";
import { resolveDefaultAccessExpiresAt } from "@/lib/access-keys";
import { getPlatformSettings } from "@/lib/platform-settings";
import {
  countUserCalculators,
  getEffectiveMaxCalculators,
  isAccessActive,
} from "@/lib/user-limits";

const createSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8).max(128),
  name: z.string().min(1).max(80).optional(),
  role: z.nativeEnum(Role).optional(),
  maxCalculators: z.number().int().min(0).max(1000).nullable().optional(),
  accessExpiresAt: z.string().datetime().nullable().optional(),
  adminNotes: z.string().max(500).optional(),
});

export async function GET() {
  try {
    await requireAdmin();
    const platform = await getPlatformSettings();

    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
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

    const rows = await Promise.all(
      users.map(async (user) => {
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
      }),
    );

    return NextResponse.json({
      users: rows,
      defaultMaxCalculators: platform.defaultMaxCalculators,
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
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        banned: true,
        banReason: true,
        maxCalculators: true,
        accessExpiresAt: true,
        createdAt: true,
      },
    });

    const calculatorsCount = await countUserCalculators(user.id);
    const effectiveMaxCalculators = await getEffectiveMaxCalculators(user);

    return NextResponse.json(
      {
        user: {
          ...user,
          accessExpiresAt: user.accessExpiresAt?.toISOString() ?? null,
          accessActive: isAccessActive(user),
          createdAt: user.createdAt.toISOString(),
          calculatorsCount,
          effectiveMaxCalculators,
          usesDefaultLimit: user.maxCalculators == null && user.role !== Role.ADMIN,
        },
      },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }
    return handleAdminApiError(error, "admin/users POST");
  }
}
