import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth-session";
import { UserAccessError, assertCanCreateCalculator } from "@/lib/user-limits";
import {
  createUniqueSlug,
  toCalculatorResponse,
  serializeConfig,
} from "@/lib/calculator-service";
import { parseCalculatorConfig } from "@/types/calculator";

const bodySchema = z.object({
  templateSlug: z.string().min(1),
  name: z.string().min(1).max(120).optional(),
});

export async function POST(request: Request) {
  try {
    const session = await requireActiveUser();
    await assertCanCreateCalculator(session.user.id);
    const body = bodySchema.parse(await request.json());

    const template = await db.calculator.findFirst({
      where: { slug: body.templateSlug, isTemplate: true },
    });

    if (!template) {
      return NextResponse.json({ error: "Шаблон не найден" }, { status: 404 });
    }

    const config = parseCalculatorConfig(template.config);
    const name = body.name ?? `${template.name} (копия)`;
    const slug = await createUniqueSlug(name);

    const calculator = await db.calculator.create({
      data: {
        userId: session.user.id,
        name,
        description: template.description,
        slug,
        config: serializeConfig(config),
        isPublic: false,
      },
    });

    return NextResponse.json(
      { calculator: toCalculatorResponse(calculator) },
      { status: 201 },
    );
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Некорректные данные" }, { status: 400 });
    }
    if (error instanceof UserAccessError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 403 },
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: "Ошибка клонирования" }, { status: 500 });
  }
}
