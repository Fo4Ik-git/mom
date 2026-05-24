import { NextResponse } from "next/server";
import { Role } from "@prisma/client";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireAdmin } from "@/lib/auth-session";

const updateSchema = z.object({
  role: z.nativeEnum(Role).optional(),
  banned: z.boolean().optional(),
});

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = updateSchema.parse(await request.json());

    if (id === session.user.id && body.banned === true) {
      return NextResponse.json(
        { error: "Нельзя заблокировать себя" },
        { status: 400 },
      );
    }

    const user = await db.user.update({
      where: { id },
      data: body,
      select: {
        id: true,
        email: true,
        role: true,
        banned: true,
      },
    });

    return NextResponse.json({ user });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
}
