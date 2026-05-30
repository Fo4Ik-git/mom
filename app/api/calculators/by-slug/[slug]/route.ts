import { auth } from "@/auth";
import { getCalculatorAccess } from "@/lib/calculator/access";
import { findCalculatorByRouteParam } from "@/lib/calculator/route";
import { toCalculatorResponse } from "@/lib/calculator/service";
import { Role } from "@prisma/client";
import { NextResponse } from "next/server";
import { withApiRoute } from "@/lib/api/with-api-route";

export const GET = withApiRoute(async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: routeParam } = await params;
  const session = await auth();

  const calculator = await findCalculatorByRouteParam(routeParam);

  if (!calculator) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const userId = session?.user?.id;
  const userRole = session?.user?.role ?? Role.USER;
  const access = userId
    ? await getCalculatorAccess(calculator.id, userId, userRole)
    : null;

  const canView =
    calculator.isPublic ||
    calculator.isTemplate ||
    access !== null;

  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const isOwner = userId === calculator.userId;
  const canEdit =
    access !== null &&
    (access.kind === "owner" ||
      access.kind === "admin" ||
      access.kind === "edit");

  return NextResponse.json({
    calculator: toCalculatorResponse(calculator),
    canEdit: isOwner || canEdit,
  });
}
);
