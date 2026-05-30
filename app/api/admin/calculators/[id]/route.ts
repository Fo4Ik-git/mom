import { NextResponse } from "next/server";
import { z } from "zod";
import { accessKindToResponse, findUserByEmail } from "@/lib/calculator/access";
import {
  CalculatorValidationError,
  serializeConfig,
  toCalculatorResponse,
  validateCalculatorConfig,
} from "@/lib/calculator/service";
import { listCalculatorShares } from "@/lib/calculator/shares";
import { db } from "@/lib/platform/db";
import { handleAdminApiError } from "@/lib/admin/admin-api-response";
import { requireAdmin } from "@/lib/auth/auth-session";
import {
  formatZodIssues,
  validationErrorResponse,
} from "@/lib/platform/validation-errors";
import { calculatorConfigSchema } from "@/types/calculator";
import { withApiRoute } from "@/lib/api/with-api-route";
import { setAuditDetail } from "@/lib/logger/audit";

const patchSchema = z.object({
  ownerEmail: z.string().email().optional(),
  ownerUserId: z.string().min(1).optional(),
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
    await requireAdmin();
    const { id } = await params;

    const calculator = await db.calculator.findUnique({ where: { id } });
    if (!calculator) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    const owner = await db.user.findUnique({
      where: { id: calculator.userId },
      select: { id: true, email: true, name: true },
    });
    const shares = await listCalculatorShares(id);

    return NextResponse.json({
      calculator: {
        id: calculator.id,
        name: calculator.name,
        slug: calculator.slug,
        isPublic: calculator.isPublic,
        isTemplate: calculator.isTemplate,
        userId: calculator.userId,
        ownerEmail: owner?.email ?? null,
        ownerName: owner?.name ?? null,
        updatedAt: calculator.updatedAt.toISOString(),
      },
      shares,
    });
  } catch (error) {
    return handleAdminApiError(error, "admin/calculators/[id]");
  }
}
);

export const PATCH = withApiRoute(async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = patchSchema.parse(await request.json());

    const calculator = await db.calculator.findUnique({ where: { id } });
    if (!calculator) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }
    if (calculator.isTemplate) {
      return NextResponse.json({ error: "cannot_edit_template" }, { status: 400 });
    }

    const wantsTransfer = Boolean(body.ownerEmail || body.ownerUserId);
    const wantsContent =
      body.name !== undefined ||
      body.description !== undefined ||
      body.config !== undefined ||
      body.isPublic !== undefined;

    if (wantsContent) {
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

      setAuditDetail({
        calculator: { id, name: updated.name, slug: updated.slug },
        changes: {
          ...(body.name !== undefined ? { name: body.name } : {}),
          ...(body.isPublic !== undefined ? { is_public: body.isPublic } : {}),
          ...(body.config !== undefined ? { config_updated: true } : {}),
        },
      });

      return NextResponse.json({
        calculator: {
          ...toCalculatorResponse(updated),
          ...accessKindToResponse("admin"),
        },
      });
    }

    if (!wantsTransfer) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    let newOwnerId = body.ownerUserId;
    if (body.ownerEmail) {
      const user = await findUserByEmail(body.ownerEmail);
      if (!user) {
        return NextResponse.json({ error: "user_not_found" }, { status: 404 });
      }
      newOwnerId = user.id;
    }

    if (!newOwnerId) {
      return NextResponse.json({ error: "invalid_body" }, { status: 400 });
    }

    if (newOwnerId === calculator.userId) {
      return NextResponse.json({ ok: true, userId: newOwnerId });
    }

    await db.$transaction([
      db.calculator.update({
        where: { id },
        data: { userId: newOwnerId },
      }),
      db.calculatorShare.deleteMany({
        where: { calculatorId: id, userId: newOwnerId },
      }),
    ]);

    const owner = await db.user.findUnique({
      where: { id: newOwnerId },
      select: { email: true, name: true },
    });

    setAuditDetail({
      calculator: { id, name: calculator.name },
      transfer: {
        from_user_id: calculator.userId,
        to_user_id: newOwnerId,
        to_email: owner?.email ?? body.ownerEmail ?? null,
      },
    });

    return NextResponse.json({
      ok: true,
      userId: newOwnerId,
      ownerEmail: owner?.email ?? null,
      ownerName: owner?.name ?? null,
    });
  } catch (error) {
    if (error instanceof CalculatorValidationError) {
      return NextResponse.json(
        validationErrorResponse(error.issues, "CALCULATOR_BUILDER"),
        { status: 400 },
      );
    }
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        validationErrorResponse(formatZodIssues(error), "CALCULATOR_BUILDER"),
        { status: 400 },
      );
    }
    return handleAdminApiError(error, "admin/calculators/[id]");
  }
}
);

export const DELETE = withApiRoute(async function DELETE(
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
);
