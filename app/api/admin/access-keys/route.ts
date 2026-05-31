import { AccessKeyKind, Prisma, Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { buildAdminAccessKeysSearchWhere } from "@/lib/admin/admin-access-keys-list";
import {
  buildTablePagination,
  parseTablePage,
  parseTablePageSize,
} from "@/lib/ui/table-pagination";
import { createAccessKey, normalizeAccessKeyCode } from "@/lib/access/access-keys";
import { handleAdminApiError } from "@/lib/admin/admin-api-response";
import { db } from "@/lib/platform/db";
import { requireAdmin } from "@/lib/auth/auth-session";
import { withApiRoute } from "@/lib/api/with-api-route";

const createSchema = z.object({
  label: z.string().max(120).optional(),
  maxUses: z.number().int().min(1).max(100_000).nullable().optional(),
  expiresAt: z.string().datetime().nullable().optional(),
  accessDays: z.number().int().min(0).max(3650).nullable().optional(),
  referrerBonusDays: z.number().int().min(0).max(3650).nullable().optional(),
  active: z.boolean().optional(),
  referrerUserId: z.string().cuid(),
  code: z.string().min(4).max(32).optional(),
});

export const GET = withApiRoute(async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const page = parseTablePage(searchParams.get("page"));
    const pageSize = parseTablePageSize(searchParams.get("pageSize"));
    const searchWhere = buildAdminAccessKeysSearchWhere(q);
    const where = {
      kind: AccessKeyKind.REFERRAL,
      ...(searchWhere ?? {}),
    };
    const skip = (page - 1) * pageSize;

    const [total, keys] = await Promise.all([
      db.accessKey.count({ where }),
      db.accessKey.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: pageSize,
        include: {
          referrerUser: { select: { id: true, email: true } },
          _count: { select: { redemptions: true } },
        },
      }),
    ]);

    const pagination = buildTablePagination(page, pageSize, total);

    return NextResponse.json({
      keys: keys.map((key) => ({
        id: key.id,
        code: key.code,
        kind: key.kind,
        label: key.label,
        maxUses: key.maxUses,
        usedCount: key.usedCount,
        redemptionCount: key._count.redemptions,
        expiresAt: key.expiresAt?.toISOString() ?? null,
        accessDays: key.accessDays,
        referrerBonusDays: key.referrerBonusDays,
        active: key.active,
        referrerUserId: key.referrerUserId,
        referrerEmail: key.referrerUser?.email ?? null,
        createdAt: key.createdAt.toISOString(),
      })),
      pagination,
    });
  } catch (error) {
    return handleAdminApiError(error, "admin/access-keys GET");
  }
}
);

export const POST = withApiRoute(async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = createSchema.parse(await request.json());

    const code = body.code ? normalizeAccessKeyCode(body.code) : "";
    if (code.length > 0 && code.length < 4) {
      return NextResponse.json({ error: "invalid_code" }, { status: 400 });
    }
    await db.accessKey.deleteMany({
      where: {
        referrerUserId: body.referrerUserId,
        kind: AccessKeyKind.REFERRAL,
      },
    });

    const referrer = await db.user.findUnique({
      where: { id: body.referrerUserId },
      select: { role: true },
    });
    if (!referrer) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const adminReferrer =
      referrer.role === Role.ADMIN || referrer.role === Role.SUPERADMIN;

    const key = await createAccessKey({
      kind: AccessKeyKind.REFERRAL,
      label: body.label,
      maxUses: adminReferrer ? null : (body.maxUses ?? null),
      expiresAt: adminReferrer
        ? null
        : body.expiresAt
          ? new Date(body.expiresAt)
          : null,
      accessDays: body.accessDays,
      referrerBonusDays: body.referrerBonusDays,
      active: body.active ?? true,
      referrerUserId: body.referrerUserId,
      code: body.code ? normalizeAccessKeyCode(body.code) : undefined,
    });

    return NextResponse.json(
      {
        key: {
          id: key.id,
          code: key.code,
          kind: key.kind,
          label: key.label,
          maxUses: key.maxUses,
          usedCount: key.usedCount,
          expiresAt: key.expiresAt?.toISOString() ?? null,
          accessDays: key.accessDays,
          active: key.active,
          createdAt: key.createdAt.toISOString(),
        },
      },
      { status: 201 },
    );
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
    return handleAdminApiError(error, "admin/access-keys POST");
  }
}
);
