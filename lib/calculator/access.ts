import { CalculatorShareRole, Role, type Calculator } from "@prisma/client";
import { db } from "@/lib/platform/db";

export type CalculatorAccessKind = "owner" | "admin" | "edit" | "view";

export type CalculatorAccess = {
  calculator: Calculator;
  kind: CalculatorAccessKind;
  shareRole: CalculatorShareRole | null;
};

export function canEditCalculator(access: CalculatorAccess): boolean {
  return (
    access.kind === "owner" ||
    access.kind === "admin" ||
    access.kind === "edit"
  );
}

export function canManageShares(access: CalculatorAccess): boolean {
  return access.kind === "owner" || access.kind === "admin";
}

export function canDeleteCalculator(access: CalculatorAccess): boolean {
  return access.kind === "owner" || access.kind === "admin";
}

export function canTransferOwnership(access: CalculatorAccess): boolean {
  return access.kind === "admin";
}

export async function resolveUserRole(
  userId: string,
  userRole?: Role | string | null,
): Promise<Role> {
  if (userRole === Role.ADMIN || userRole === "ADMIN") {
    return Role.ADMIN;
  }
  const user = await db.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return user?.role ?? Role.USER;
}

export async function getCalculatorAccess(
  calculatorId: string,
  userId: string,
  userRole?: Role | string | null,
): Promise<CalculatorAccess | null> {
  const calculator = await db.calculator.findUnique({
    where: { id: calculatorId },
  });
  if (!calculator || calculator.isTemplate) {
    return null;
  }

  if (calculator.userId === userId) {
    return { calculator, kind: "owner", shareRole: null };
  }

  const role = await resolveUserRole(userId, userRole);

  if (role === Role.ADMIN) {
    return { calculator, kind: "admin", shareRole: null };
  }

  const share = await db.calculatorShare.findUnique({
    where: {
      calculatorId_userId: { calculatorId, userId },
    },
  });
  if (!share) {
    return null;
  }

  return {
    calculator,
    kind: share.role === CalculatorShareRole.EDIT ? "edit" : "view",
    shareRole: share.role,
  };
}

export async function findUserByEmail(email: string) {
  return db.user.findUnique({
    where: { email: email.trim().toLowerCase() },
    select: { id: true, email: true, name: true, role: true },
  });
}

export function accessKindToResponse(kind: CalculatorAccessKind) {
  return {
    isOwner: kind === "owner",
    isAdmin: kind === "admin",
    canEdit: kind === "owner" || kind === "admin" || kind === "edit",
    canManageShares: kind === "owner" || kind === "admin",
    canDelete: kind === "owner" || kind === "admin",
    accessKind: kind,
  };
}
