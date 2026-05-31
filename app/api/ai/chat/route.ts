import { NextResponse } from "next/server";
import { z } from "zod";
import { requireAiChatCalculatorAccess } from "@/lib/ai/ai-chat-access";
import {
  clearAiChatThread,
  loadAiChatMessages,
  saveAiChatMessages,
} from "@/lib/ai/ai-chat-storage";
import { requireAuth } from "@/lib/auth/auth-session";
import { withApiRoute } from "@/lib/api/with-api-route";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().min(1).max(12_000),
});

const putSchema = z.object({
  calculatorId: z.string().cuid(),
  messages: z.array(messageSchema).max(80),
});

export const GET = withApiRoute(async function GET(request: Request) {
  try {
    const session = await requireAuth();
    const calculatorId = new URL(request.url).searchParams
      .get("calculatorId")
      ?.trim();

    if (!calculatorId) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }

    await requireAiChatCalculatorAccess(
      session.user.id,
      calculatorId,
      session.user.role,
    );

    const messages = await loadAiChatMessages(session.user.id, calculatorId);

    return NextResponse.json({ messages });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      if (error.message === "AI access denied") {
        return NextResponse.json({ error: "ai_access_denied" }, { status: 403 });
      }
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
});

export const PUT = withApiRoute(async function PUT(request: Request) {
  try {
    const session = await requireAuth();
    const body = putSchema.parse(await request.json());

    await requireAiChatCalculatorAccess(
      session.user.id,
      body.calculatorId,
      session.user.role,
    );

    await saveAiChatMessages(
      session.user.id,
      body.calculatorId,
      body.messages,
    );

    const messages = await loadAiChatMessages(
      session.user.id,
      body.calculatorId,
    );

    return NextResponse.json({ messages });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      if (error.message === "AI access denied") {
        return NextResponse.json({ error: "ai_access_denied" }, { status: 403 });
      }
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
});

export const DELETE = withApiRoute(async function DELETE(request: Request) {
  try {
    const session = await requireAuth();
    const calculatorId = new URL(request.url).searchParams
      .get("calculatorId")
      ?.trim();

    if (!calculatorId) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }

    await requireAiChatCalculatorAccess(
      session.user.id,
      calculatorId,
      session.user.role,
    );

    await clearAiChatThread(session.user.id, calculatorId);

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "Unauthorized") {
        return NextResponse.json({ error: "unauthorized" }, { status: 401 });
      }
      if (error.message === "Forbidden") {
        return NextResponse.json({ error: "forbidden" }, { status: 403 });
      }
      if (error.message === "AI access denied") {
        return NextResponse.json({ error: "ai_access_denied" }, { status: 403 });
      }
    }
    return NextResponse.json({ error: "server_error" }, { status: 500 });
  }
});
