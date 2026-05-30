import { requireActiveUser } from "@/lib/auth/auth-session";
import {
  accessKindToResponse,
  canDeleteCalculator,
  canEditCalculator,
  getCalculatorAccess,
} from "@/lib/calculator/access";
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
import { withApiRoute } from "@/lib/api/with-api-route";

const updateSchema = z.object({
  name: z.string().min(1).max(120).optional(),
  description: z.string().max(500).optional().nullable(),
  config: calculatorConfigSchema.optional(),
  isPublic: z.boolean().optional(),
});

export const GET = withApiRoute(async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireActiveUser();
    const { id } = await params;
    const access = await getCalculatorAccess(
      id,
      session.user.id,
      session.user.role,
    );

    if (!access) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    return NextResponse.json({
      calculator: {
        ...toCalculatorResponse(access.calculator),
        ...accessKindToResponse(access.kind),
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
);

export const PATCH = withApiRoute(async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireActiveUser();
    const { id } = await params;
    const access = await getCalculatorAccess(
      id,
      session.user.id,
      session.user.role,
    );

    if (!access || !canEditCalculator(access)) {
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

    return NextResponse.json({
      calculator: {
        ...toCalculatorResponse(updated),
        ...accessKindToResponse(access.kind),
      },
    });
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
);

export const DELETE = withApiRoute(async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const session = await requireActiveUser();
    const { id } = await params;
    const access = await getCalculatorAccess(
      id,
      session.user.id,
      session.user.role,
    );

    if (!access || !canDeleteCalculator(access)) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await db.calculator.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
);
