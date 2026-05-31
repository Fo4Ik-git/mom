import "server-only";

import type { AiChatMessage } from "@/lib/ai/chat-types";
import { db } from "@/lib/platform/db";

export const AI_CHAT_MAX_MESSAGES = 80;

export function toChatEntries(
  rows: Array<{ id: string; role: string; content: string }>,
): Array<AiChatMessage & { id: string }> {
  return rows.map((row) => ({
    id: row.id,
    role: row.role as AiChatMessage["role"],
    content: row.content,
  }));
}

export async function loadAiChatMessages(
  userId: string,
  calculatorId: string,
): Promise<Array<AiChatMessage & { id: string }>> {
  const thread = await db.aiChatThread.findUnique({
    where: {
      userId_calculatorId: { userId, calculatorId },
    },
    select: {
      messages: {
        orderBy: { sortOrder: "asc" },
        select: { id: true, role: true, content: true },
      },
    },
  });

  if (!thread) {
    return [];
  }

  return toChatEntries(thread.messages);
}

export async function saveAiChatMessages(
  userId: string,
  calculatorId: string,
  messages: AiChatMessage[],
): Promise<void> {
  const trimmed = messages.slice(-AI_CHAT_MAX_MESSAGES);

  await db.$transaction(async (tx) => {
    const thread = await tx.aiChatThread.upsert({
      where: {
        userId_calculatorId: { userId, calculatorId },
      },
      create: { userId, calculatorId },
      update: { updatedAt: new Date() },
    });

    await tx.aiChatMessage.deleteMany({
      where: { threadId: thread.id },
    });

    if (trimmed.length === 0) {
      return;
    }

    await tx.aiChatMessage.createMany({
      data: trimmed.map((message, index) => ({
        threadId: thread.id,
        role: message.role,
        content: message.content,
        sortOrder: index,
      })),
    });
  });
}

export async function clearAiChatThread(
  userId: string,
  calculatorId: string,
): Promise<void> {
  await db.aiChatThread.deleteMany({
    where: { userId, calculatorId },
  });
}
