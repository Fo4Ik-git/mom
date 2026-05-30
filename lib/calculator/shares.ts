import { CalculatorShareRole } from "@prisma/client";
import { db } from "@/lib/platform/db";
import { findUserByEmail } from "@/lib/calculator/access";

export type ShareRow = {
  id: string;
  userId: string;
  email: string;
  name: string | null;
  role: CalculatorShareRole;
  createdAt: string;
};

export async function listCalculatorShares(
  calculatorId: string,
): Promise<ShareRow[]> {
  const shares = await db.calculatorShare.findMany({
    where: { calculatorId },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
    orderBy: { createdAt: "asc" },
  });

  return shares.map((share) => ({
    id: share.id,
    userId: share.userId,
    email: share.user.email,
    name: share.user.name,
    role: share.role,
    createdAt: share.createdAt.toISOString(),
  }));
}

export async function upsertCalculatorShare(
  calculatorId: string,
  ownerUserId: string,
  email: string,
  role: CalculatorShareRole,
): Promise<ShareRow> {
  const target = await findUserByEmail(email);
  if (!target) {
    throw new ShareError("user_not_found");
  }
  if (target.id === ownerUserId) {
    throw new ShareError("cannot_share_with_owner");
  }

  const share = await db.calculatorShare.upsert({
    where: {
      calculatorId_userId: { calculatorId, userId: target.id },
    },
    create: { calculatorId, userId: target.id, role },
    update: { role },
    include: {
      user: { select: { id: true, email: true, name: true } },
    },
  });

  return {
    id: share.id,
    userId: share.userId,
    email: share.user.email,
    name: share.user.name,
    role: share.role,
    createdAt: share.createdAt.toISOString(),
  };
}

export class ShareError extends Error {
  code: string;

  constructor(code: string) {
    super(code);
    this.code = code;
  }
}
