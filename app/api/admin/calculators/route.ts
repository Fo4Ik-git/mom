import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleAdminApiError } from "@/lib/admin-api-response";
import { requireAdmin } from "@/lib/auth-session";

export async function GET() {
  try {
    await requireAdmin();

    const calculators = await db.calculator.findMany({
      orderBy: { updatedAt: "desc" },
    });

    const userIds = [...new Set(calculators.map((c) => c.userId))];
    const users =
      userIds.length > 0
        ? await db.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, email: true, name: true },
          })
        : [];
    const userById = new Map(users.map((u) => [u.id, u]));

    return NextResponse.json({
      calculators: calculators.map((calculator) => {
        const owner = userById.get(calculator.userId);
        return {
          id: calculator.id,
          name: calculator.name,
          slug: calculator.slug,
          isPublic: calculator.isPublic,
          isTemplate: calculator.isTemplate,
          userId: calculator.userId,
          ownerEmail: owner?.email ?? null,
          ownerName: owner?.name ?? null,
          ownerMissing: !owner,
          updatedAt: calculator.updatedAt.toISOString(),
        };
      }),
    });
  } catch (error) {
    return handleAdminApiError(error, "admin/calculators");
  }
}
