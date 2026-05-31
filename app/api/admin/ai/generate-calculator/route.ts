import { NextResponse } from "next/server";
import { z } from "zod";
import { generateCalculatorFromChat } from "@/lib/ai/generate-calculator-script";
import { handleAdminApiError } from "@/lib/admin/admin-api-response";
import { requireAdmin } from "@/lib/auth/auth-session";
import { withApiRoute } from "@/lib/api/with-api-route";
import { setAuditDetail } from "@/lib/logger/audit";
import { calculatorConfigSchema } from "@/types/calculator";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(12000),
});

const bodySchema = z
  .object({
    prompt: z.string().trim().min(8).max(4000).optional(),
    messages: z.array(messageSchema).min(1).max(24).optional(),
    /** Live builder state — AI revises this script on each turn */
    currentConfig: calculatorConfigSchema.optional(),
  })
  .refine((body) => Boolean(body.prompt) || Boolean(body.messages?.length), {
    message: "prompt or messages required",
  });

export const POST = withApiRoute(async function POST(request: Request) {
  try {
    await requireAdmin();
    const body = bodySchema.parse(await request.json());

    const messages =
      body.messages ??
      (body.prompt ? [{ role: "user" as const, content: body.prompt }] : []);

    const result = await generateCalculatorFromChat(messages, body.currentConfig);

    setAuditDetail({
      ai: {
        ok: result.ok,
        message_count: messages.length,
        used_cache: result.usedCache,
      },
    });

    if (!result.ok) {
      return NextResponse.json(
        {
          ok: false,
          script: result.script,
          errors: result.errors,
        },
        { status: 422 },
      );
    }

    return NextResponse.json({
      ok: true,
      script: result.script,
      config: result.config,
      usedCache: result.usedCache,
    });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      if (error.message === "GEMINI_API_KEY is not configured") {
        return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
      }
      if (error.message === "Prompt is required") {
        return NextResponse.json({ error: "invalid_data" }, { status: 400 });
      }
    }
    return handleAdminApiError(error, "admin.ai.generate-calculator");
  }
});
