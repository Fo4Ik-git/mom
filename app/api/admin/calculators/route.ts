import { NextResponse } from "next/server";
import { buildAdminCalculatorsSearchWhere } from "@/lib/admin/admin-calculators-list";
import {
  buildTablePagination,
  parseTablePage,
  parseTablePageSize,
} from "@/lib/ui/table-pagination";
import { handleAdminApiError } from "@/lib/admin/admin-api-response";
import { requireAdmin } from "@/lib/auth/auth-session";
import { db } from "@/lib/platform/db";
import { withApiRoute } from "@/lib/api/with-api-route";

export const GET = withApiRoute(async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const q = (searchParams.get("q") ?? "").trim();
    const page = parseTablePage(searchParams.get("page"));
    const pageSize = parseTablePageSize(searchParams.get("pageSize"));
    const where = buildAdminCalculatorsSearchWhere(q);
    const skip = (page - 1) * pageSize;

    const [total, calculators] = await Promise.all([
      db.calculator.count({ where }),
      db.calculator.findMany({
        where,
        orderBy: { updatedAt: "desc" },
        skip,
        take: pageSize,
      }),
    ]);

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
      pagination: buildTablePagination(page, pageSize, total),
    });
  } catch (error) {
    return handleAdminApiError(error, "admin/calculators");
  }
}
);
