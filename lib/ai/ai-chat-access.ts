import "server-only";

import {
  canEditCalculator,
  getCalculatorAccess,
} from "@/lib/calculator/access";
import { isAiAssistantAccessActive } from "@/lib/ai/ai-access";
import { db } from "@/lib/platform/db";

export async function requireAiChatCalculatorAccess(
  userId: string,
  calculatorId: string,
  userRole?: string | null,
) {
  const access = await getCalculatorAccess(calculatorId, userId, userRole);
  if (!access || !canEditCalculator(access)) {
    throw new Error("Forbidden");
  }

  const user = await db.user.findUnique({
    where: { id: userId },
    select: {
      id: true,
      role: true,
      aiAccessMode: true,
      aiAccessExpiresAt: true,
      aiAccessGrantedAt: true,
      aiAccessDurationDays: true,
    },
  });

  if (!user || !isAiAssistantAccessActive(user)) {
    throw new Error("AI access denied");
  }

  return access;
}
