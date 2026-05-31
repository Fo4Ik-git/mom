import "server-only";

import { NextResponse } from "next/server";
import { z } from "zod";
import type { AiChatMessage } from "@/lib/ai/chat-types";
import { generateCalculatorFromChat } from "@/lib/ai/generate-calculator-script";
import {
  AiQuotaExceededError,
  assertAiQuotaAvailable,
  recordAiTokenUsages,
} from "@/lib/ai/ai-quota";
import { isAiAssistantAccessActive } from "@/lib/ai/ai-access";
import { db } from "@/lib/platform/db";
import { setAuditDetail } from "@/lib/logger/audit";
import { calculatorConfigSchema } from "@/types/calculator";

const messageSchema = z.object({
  role: z.enum(["user", "assistant"]),
  content: z.string().trim().min(1).max(12000),
});

export const generateCalculatorBodySchema = z
  .object({
    prompt: z.string().trim().min(8).max(4000).optional(),
    messages: z.array(messageSchema).min(1).max(24).optional(),
    currentConfig: calculatorConfigSchema.optional(),
    calculatorId: z.string().cuid().optional(),
  })
  .refine((body) => Boolean(body.prompt) || Boolean(body.messages?.length), {
    message: "prompt or messages required",
  });

const aiUserSelect = {
  id: true,
  role: true,
  aiAccessMode: true,
  aiAccessExpiresAt: true,
  aiAccessGrantedAt: true,
  aiAccessDurationDays: true,
  aiTokenQuota: true,
  aiTokenQuotaPeriod: true,
} as const;

export async function handleGenerateCalculatorRequest(
  userId: string,
  body: z.infer<typeof generateCalculatorBodySchema>,
) {
  const user = await db.user.findUnique({
    where: { id: userId },
    select: aiUserSelect,
  });

  if (!user) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!isAiAssistantAccessActive(user)) {
    return NextResponse.json({ error: "ai_access_denied" }, { status: 403 });
  }

  try {
    await assertAiQuotaAvailable(user);
  } catch (error) {
    if (error instanceof AiQuotaExceededError) {
      return NextResponse.json(
        {
          error: "ai_quota_exceeded",
          resetAt: error.periodEnd.toISOString(),
        },
        { status: 429 },
      );
    }
    throw error;
  }

  const messages: AiChatMessage[] =
    body.messages ??
    (body.prompt ? [{ role: "user" as const, content: body.prompt }] : []);

  const result = await generateCalculatorFromChat(
    messages,
    body.currentConfig,
  );

  await recordAiTokenUsages(
    userId,
    result.tokenUsages,
    body.calculatorId,
  );

  const totalTokens = result.tokenUsages.reduce(
    (sum, usage) => sum + usage.totalTokens,
    0,
  );

  setAuditDetail({
    ai: {
      ok: result.ok,
      message_count: messages.length,
      used_cache: result.usedCache,
      total_tokens: totalTokens,
      request_count: result.tokenUsages.length,
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
}

export async function loadAiUserForSession(session: {
  id: string;
  role?: string;
}) {
  return db.user.findUnique({
    where: { id: session.id },
    select: aiUserSelect,
  });
}

export function canShowAiInBuilder(
  user: Awaited<ReturnType<typeof loadAiUserForSession>>,
): boolean {
  if (!user) {
    return false;
  }
  return isAiAssistantAccessActive(user);
}

