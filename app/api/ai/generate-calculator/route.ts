import { NextResponse } from "next/server";
import { z } from "zod";
import {
  generateCalculatorBodySchema,
  handleGenerateCalculatorRequest,
} from "@/lib/ai/handle-generate-calculator-request";
import { handleAdminApiError } from "@/lib/admin/admin-api-response";
import { requireAuth } from "@/lib/auth/auth-session";
import { withApiRoute } from "@/lib/api/with-api-route";

export const POST = withApiRoute(async function POST(request: Request) {
  try {
    const session = await requireAuth();
    const body = generateCalculatorBodySchema.parse(await request.json());
    return handleGenerateCalculatorRequest(session.user.id, body);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      if (error.message === "GEMINI_API_KEY is not configured") {
        return NextResponse.json({ error: "ai_not_configured" }, { status: 503 });
      }
      if (error.message === "Prompt is required") {
        return NextResponse.json({ error: "invalid_data" }, { status: 400 });
      }
    }
    return handleAdminApiError(error, "ai.generate-calculator");
  }
});
