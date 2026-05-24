import { NextResponse } from "next/server";
import { db } from "@/lib/db";
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
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    if (calculator.isTemplate) {
      return NextResponse.json(
        { error: "Нельзя удалить системный шаблон" },
        { status: 400 },
      );
    }

    await db.calculator.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
