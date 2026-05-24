import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-session";

export async function GET() {
  try {
    await requireAdmin();

    const calculators = await db.calculator.findMany({
      orderBy: { updatedAt: "desc" },
      include: {
        user: { select: { email: true, name: true } },
      },
    });

    return NextResponse.json({
      calculators: calculators.map((calculator) => ({
        id: calculator.id,
        name: calculator.name,
        slug: calculator.slug,
        isPublic: calculator.isPublic,
        isTemplate: calculator.isTemplate,
        userId: calculator.userId,
        ownerEmail: calculator.user.email,
        ownerName: calculator.user.name,
        updatedAt: calculator.updatedAt.toISOString(),
      })),
    });
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
