import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-session";

export async function GET() {
  try {
    await requireAdmin();

    const [users, calculators, templates, publicCalculators] =
      await Promise.all([
        db.user.count(),
        db.calculator.count(),
        db.calculator.count({ where: { isTemplate: true } }),
        db.calculator.count({ where: { isPublic: true } }),
      ]);

    return NextResponse.json({
      users,
      calculators,
      templates,
      publicCalculators,
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
