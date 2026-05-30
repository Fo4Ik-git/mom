import { NextResponse } from "next/server";
import { db } from "@/lib/platform/db";
import { handleAdminApiError } from "@/lib/admin/admin-api-response";
import { requireAdmin } from "@/lib/auth/auth-session";

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; userId: string }> },
) {
  try {
    await requireAdmin();
    const { id, userId } = await params;
    await db.calculatorShare.deleteMany({
      where: { calculatorId: id, userId },
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAdminApiError(error, "admin/calculators/[id]/shares/[userId]");
  }
}
