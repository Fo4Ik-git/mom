import { NextResponse } from "next/server";
import {
  canManageShares,
  getCalculatorAccess,
} from "@/lib/calculator/access";
import { db } from "@/lib/platform/db";
import { requireActiveUser } from "@/lib/auth/auth-session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    const session = await requireActiveUser();
    const { id, userId } = await params;
    const access = await getCalculatorAccess(
      id,
      session.user.id,
      session.user.role,
    );
    if (!access || !canManageShares(access)) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    await db.calculatorShare.deleteMany({
      where: { calculatorId: id, userId },
    });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }
}
