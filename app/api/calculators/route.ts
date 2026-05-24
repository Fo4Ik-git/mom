import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { requireActiveUser } from "@/lib/auth-session";
import { UserAccessError, assertCanCreateCalculator } from "@/lib/user-limits";
import {
  CalculatorValidationError,
  createUniqueSlug,
  toCalculatorResponse,
  validateCalculatorConfig,
  serializeConfig,
} from "@/lib/calculator-service";
import {
  formatZodIssues,
  validationErrorResponse,
} from "@/lib/validation-errors";
import { calculatorConfigSchema } from "@/types/calculator";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  config: calculatorConfigSchema,
  isPublic: z.boolean().optional(),
});

export async function GET() {
  try {
    const session = await requireActiveUser();
    const calculators = await db.calculator.findMany({
      where: { userId: session.user.id, isTemplate: false },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json({
      calculators: calculators.map(toCalculatorResponse),
    });
  } catch (error) {
    if (error instanceof UserAccessError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: error.code === "banned" ? 403 : 403 },
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    const session = await requireActiveUser();
    await assertCanCreateCalculator(session.user.id);
    const body = createSchema.parse(await request.json());
    const config = validateCalculatorConfig(body.config);
    const slug = await createUniqueSlug(body.name);

    const calculator = await db.calculator.create({
      data: {
        userId: session.user.id,
        name: body.name,
        description: body.description,
        slug,
        config: serializeConfig(config),
        isPublic: body.isPublic ?? false,
      },
    });

    return NextResponse.json(
      { calculator: toCalculatorResponse(calculator) },
      { status: 201 },
    );
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
    if (error instanceof UserAccessError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 403 },
      );
    }
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
    return NextResponse.json({ error: "Ошибка создания" }, { status: 500 });
  }
}
