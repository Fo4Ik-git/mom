import { CalculatorShareRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import { listCalculatorShares, ShareError, upsertCalculatorShare } from "@/lib/calculator/shares";
import { db } from "@/lib/platform/db";
import { handleAdminApiError } from "@/lib/admin/admin-api-response";
import { requireAdmin } from "@/lib/auth/auth-session";
import { withApiRoute } from "@/lib/api/with-api-route";

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(["VIEW", "EDIT"]).default("EDIT"),
});

export const GET = withApiRoute(async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const calculator = await db.calculator.findUnique({ where: { id } });
    if (!calculator) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    const shares = await listCalculatorShares(id);
    return NextResponse.json({ shares });
  } catch (error) {
    return handleAdminApiError(error, "admin/calculators/[id]/shares");
  }
}
);

export const POST = withApiRoute(async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const calculator = await db.calculator.findUnique({ where: { id } });
    if (!calculator || calculator.isTemplate) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const body = createSchema.parse(await request.json());
    const share = await upsertCalculatorShare(
      id,
      calculator.userId,
      body.email,
      body.role as CalculatorShareRole,
    );
    return NextResponse.json({ share }, { status: 201 });
  } catch (error) {
    if (error instanceof ShareError) {
      return NextResponse.json({ error: error.code }, { status: 400 });
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }
    return handleAdminApiError(error, "admin/calculators/[id]/shares");
  }
}
);
