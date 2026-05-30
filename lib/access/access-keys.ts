import { AccessKeyKind, Prisma, type AccessKey } from "@prisma/client";
import { randomBytes } from "crypto";
import { normalizeAccessKeyCode } from "@/lib/access/access-key-code";
import { db } from "@/lib/platform/db";
import { getPlatformSettings } from "@/lib/platform/platform-settings";

export { normalizeAccessKeyCode } from "@/lib/access/access-key-code";

const CODE_CHARSET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const CODE_LENGTH = 10;

export type AccessKeyFailureReason =
  | "invalid"
  | "inactive"
  | "expired"
  | "exhausted";

export class AccessKeyError extends Error {
  constructor(public readonly reason: AccessKeyFailureReason) {
    super(reason);
  }
}

export function generateAccessKeyCode(): string {
  const bytes = randomBytes(CODE_LENGTH);
  let code = "";
  for (let i = 0; i < CODE_LENGTH; i++) {
    code += CODE_CHARSET[bytes[i]! % CODE_CHARSET.length];
  }
  return code;
}

function isSignupKind(kind: AccessKeyKind): boolean {
  return kind === AccessKeyKind.REGISTRATION || kind === AccessKeyKind.REFERRAL;
}

export function validateAccessKeyRecord(
  key: AccessKey | null,
  options?: { kinds?: AccessKeyKind[] },
): key is AccessKey {
  if (!key || !key.active) {
    return false;
  }
  const kinds = options?.kinds ?? [
    AccessKeyKind.REGISTRATION,
    AccessKeyKind.REFERRAL,
  ];
  if (!kinds.includes(key.kind)) {
    return false;
  }
  if (key.expiresAt && key.expiresAt.getTime() <= Date.now()) {
    return false;
  }
  if (key.maxUses != null && key.usedCount >= key.maxUses) {
    return false;
  }
  return true;
}

export async function findAccessKeyByCode(code: string) {
  const normalized = normalizeAccessKeyCode(code);
  if (!normalized) {
    return null;
  }
  return db.accessKey.findUnique({ where: { code: normalized } });
}

export async function inspectAccessKey(code: string) {
  const key = await findAccessKeyByCode(code);
  if (!key) {
    return { valid: false as const, reason: "invalid" as const };
  }
  if (!key.active) {
    return { valid: false as const, reason: "inactive" as const };
  }
  if (!isSignupKind(key.kind)) {
    return { valid: false as const, reason: "invalid" as const };
  }
  if (key.expiresAt && key.expiresAt.getTime() <= Date.now()) {
    return { valid: false as const, reason: "expired" as const };
  }
  if (key.maxUses != null && key.usedCount >= key.maxUses) {
    return { valid: false as const, reason: "exhausted" as const };
  }
  return {
    valid: true as const,
    label: key.label,
    kind: key.kind,
    usesLeft:
      key.maxUses != null ? Math.max(0, key.maxUses - key.usedCount) : null,
  };
}

export async function resolveAccessExpiresAt(
  key: Pick<AccessKey, "accessDays">,
): Promise<Date | null> {
  const platform = await getPlatformSettings();
  const days = key.accessDays ?? platform.defaultAccessDays;
  if (days <= 0) {
    return null;
  }
  const expires = new Date();
  expires.setDate(expires.getDate() + days);
  return expires;
}

export async function resolveDefaultAccessExpiresAt(): Promise<Date | null> {
  const platform = await getPlatformSettings();
  if (platform.defaultAccessDays <= 0) {
    return null;
  }
  const expires = new Date();
  expires.setDate(expires.getDate() + platform.defaultAccessDays);
  return expires;
}

function assertSignupKeyOrThrow(key: AccessKey | null): AccessKey {
  if (!key) {
    throw new AccessKeyError("invalid");
  }
  if (!key.active) {
    throw new AccessKeyError("inactive");
  }
  if (!isSignupKind(key.kind)) {
    throw new AccessKeyError("invalid");
  }
  if (key.expiresAt && key.expiresAt.getTime() <= Date.now()) {
    throw new AccessKeyError("expired");
  }
  if (key.maxUses != null && key.usedCount >= key.maxUses) {
    throw new AccessKeyError("exhausted");
  }
  return key;
}

export async function registerUserWithAccessKey(params: {
  email: string;
  name?: string;
  passwordHash: string;
  accessKeyCode: string;
}) {
  const normalized = normalizeAccessKeyCode(params.accessKeyCode);
  if (!normalized) {
    throw new AccessKeyError("invalid");
  }

  const platform = await getPlatformSettings();

  return db.$transaction(async (tx) => {
    const found = await tx.accessKey.findUnique({ where: { code: normalized } });
    const key = assertSignupKeyOrThrow(found);

    const days = key.accessDays ?? platform.defaultAccessDays;
    const accessExpiresAt =
      days <= 0
        ? null
        : new Date(Date.now() + days * 24 * 60 * 60 * 1000);

    const user = await tx.user.create({
      data: {
        email: params.email,
        name: params.name,
        passwordHash: params.passwordHash,
        emailVerified: new Date(),
        accessExpiresAt,
      },
    });

    await tx.accessKeyRedemption.create({
      data: { accessKeyId: key.id, userId: user.id },
    });

    await tx.accessKey.update({
      where: { id: key.id },
      data: { usedCount: { increment: 1 } },
    });

    return user;
  });
}

export type AccessKeyCreateInput = {
  kind?: AccessKeyKind;
  label?: string | null;
  maxUses?: number | null;
  expiresAt?: Date | null;
  accessDays?: number | null;
  active?: boolean;
  referrerUserId?: string | null;
  code?: string;
};

export async function createAccessKey(
  input: AccessKeyCreateInput,
): Promise<AccessKey> {
  let code = input.code ? normalizeAccessKeyCode(input.code) : generateAccessKeyCode();
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      return await db.accessKey.create({
        data: {
          code,
          kind: input.kind ?? AccessKeyKind.REGISTRATION,
          label: input.label ?? null,
          maxUses: input.maxUses ?? null,
          expiresAt: input.expiresAt ?? null,
          accessDays: input.accessDays ?? null,
          active: input.active ?? true,
          referrerUserId: input.referrerUserId ?? null,
        },
      });
    } catch (error) {
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002" &&
        !input.code &&
        attempt < 4
      ) {
        code = generateAccessKeyCode();
        continue;
      }
      throw error;
    }
  }
  throw new Error("Could not generate unique access key");
}
