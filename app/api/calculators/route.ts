import { requireActiveUser } from "@/lib/auth/auth-session";
import {
  accessKindToResponse,
  type CalculatorAccessKind,
} from "@/lib/calculator/access";
import {
  CalculatorValidationError,
  createUniqueSlug,
  serializeConfig,
  toCalculatorResponse,
  validateCalculatorConfig,
} from "@/lib/calculator/service";
import { db } from "@/lib/platform/db";
import { UserAccessError, assertCanCreateCalculator } from "@/lib/access/user-limits";
import {
  formatZodIssues,
  validationErrorResponse,
} from "@/lib/platform/validation-errors";
import { calculatorConfigSchema } from "@/types/calculator";
import { NextResponse } from "next/server";
import { z } from "zod";
import { withApiRoute } from "@/lib/api/with-api-route";
import { setAuditDetail } from "@/lib/logger/audit";

const createSchema = z.object({
  name: z.string().min(1).max(120),
  description: z.string().max(500).optional(),
  config: calculatorConfigSchema,
  isPublic: z.boolean().optional(),
});

function withAccess(
  calculator: Parameters<typeof toCalculatorResponse>[0],
  kind: CalculatorAccessKind,
) {
  return {
    ...toCalculatorResponse(calculator),
    ...accessKindToResponse(kind),
  };
}

export const GET = withApiRoute(async function GET() {
  try {
    const session = await requireActiveUser();
    const userId = session.user.id;

    const [owned, sharedRows] = await Promise.all([
      db.calculator.findMany({
        where: { userId, isTemplate: false },
        orderBy: { updatedAt: "desc" },
      }),
      db.calculatorShare.findMany({
        where: { userId },
        include: { calculator: true },
        orderBy: { createdAt: "desc" },
      }),
    ]);

    const calculators = [
      ...owned.map((calculator) => withAccess(calculator, "owner")),
      ...sharedRows
        .filter((row) => !row.calculator.isTemplate)
        .map((row) =>
          withAccess(
            row.calculator,
            row.role === "EDIT" ? "edit" : "view",
          ),
        ),
    ];

    return NextResponse.json({ calculators });
  } catch (error) {
    if (error instanceof UserAccessError) {
      return NextResponse.json(
        { error: error.code, message: error.message },
        { status: 403 },
      );
    }
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
);

export const POST = withApiRoute(async function POST(request: Request) {
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

    setAuditDetail({
      calculator: {
        id: calculator.id,
        name: calculator.name,
        slug: calculator.slug,
        is_public: calculator.isPublic,
      },
    });

    return NextResponse.json(
      { calculator: withAccess(calculator, "owner") },
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
);
