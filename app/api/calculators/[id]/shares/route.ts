import { CalculatorShareRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { z } from "zod";
import {
  canManageShares,
  getCalculatorAccess,
} from "@/lib/calculator/access";
import {
  listCalculatorShares,
  ShareError,
  upsertCalculatorShare,
} from "@/lib/calculator/shares";
import { requireActiveUser } from "@/lib/auth/auth-session";

const createSchema = z.object({
  email: z.string().email(),
  role: z.enum(["VIEW", "EDIT"]).default("EDIT"),
});

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireActiveUser();
    const { id } = await params;
    const access = await getCalculatorAccess(
      id,
      session.user.id,
      session.user.role,
    );
    if (!access || !canManageShares(access)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const shares = await listCalculatorShares(id);
    return NextResponse.json({ shares });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireActiveUser();
    const { id } = await params;
    const access = await getCalculatorAccess(
      id,
      session.user.id,
      session.user.role,
    );
    if (!access || !canManageShares(access)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const body = createSchema.parse(await request.json());
    const share = await upsertCalculatorShare(
      id,
      access.calculator.userId,
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
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
