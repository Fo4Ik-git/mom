import { requireAuth } from "@/lib/auth/auth-session";
import {
    CalculatorValidationError,
    serializeConfig,
    toCalculatorResponse,
    validateCalculatorConfig,
} from "@/lib/calculator/service";
import { db } from "@/lib/platform/db";
import {
    formatZodIssues,
    validationErrorResponse,
} from "@/lib/platform/validation-errors";
import { calculatorConfigSchema } from "@/types/calculator";
import { NextResponse } from "next/server";
import { z } from "zod";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  config: calculatorConfigSchema.optional(),
  isPublic: z.boolean().optional(),
});

async function getOwnedCalculator(id: string, userId: string) {
  return db.calculator.findFirst({
    where: { id, userId },
  });
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const calculator = await getOwnedCalculator(id, session.user.id);

    if (!calculator) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({ calculator: toCalculatorResponse(calculator) });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const calculator = await getOwnedCalculator(id, session.user.id);

    if (!calculator) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const body = updateSchema.parse(await request.json());
    const config = body.config
      ? validateCalculatorConfig(body.config)
      : undefined;

    const updated = await db.calculator.update({
      where: { id },
      data: {
        name: body.name,
        description: body.description,
        isPublic: body.isPublic,
        config: config ? serializeConfig(config) : undefined,
      },
    });

    return NextResponse.json({ calculator: toCalculatorResponse(updated) });
  } catch (error) {
    if (error instanceof CalculatorValidationError) {
      return NextResponse.json(validationErrorResponse(error.issues), {
        status: 400,
      });
    }
    if (error instanceof z.ZodError) {
      const issues = formatZodIssues(error);
      return NextResponse.json(validationErrorResponse(issues), { status: 400 });
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Ошибка обновления" }, { status: 500 });
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    const calculator = await getOwnedCalculator(id, session.user.id);

    if (!calculator || calculator.isTemplate) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.calculator.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
