import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { handleAdminApiError } from "@/lib/admin-api-response";
import { requireAdmin } from "@/lib/auth-session";

export async function DELETE(
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

    if (calculator.isTemplate) {
      return NextResponse.json({ error: "cannot_delete_template" }, { status: 400 });
    }

    await db.calculator.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return handleAdminApiError(error, "admin/calculators/[id]");
  }
}
