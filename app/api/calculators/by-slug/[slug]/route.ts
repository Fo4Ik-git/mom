import { auth } from "@/auth";
import { findCalculatorByRouteParam } from "@/lib/calculator-route";
import { toCalculatorResponse } from "@/lib/calculator-service";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug: routeParam } = await params;
  const session = await auth();

  const calculator = await findCalculatorByRouteParam(routeParam);

  if (!calculator) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const isOwner = session?.user?.id === calculator.userId;
  const canView = calculator.isPublic || calculator.isTemplate || isOwner;

  if (!canView) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  return NextResponse.json({
    calculator: toCalculatorResponse(calculator),
    canEdit: isOwner,
  });
}
