import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/platform/db";
import { banReasonI18nKey } from "@/lib/access/ban-reasons";
import { isAllowedFrontendRequest } from "@/lib/api/api-security";
import { verifyPassword } from "@/lib/auth/password";
import { withApiRoute } from "@/lib/api/with-api-route";

const schema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
});

export const POST = withApiRoute(async function POST(request: Request) {
  if (!isAllowedFrontendRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = schema.parse(await request.json());
    const email = body.email.toLowerCase();

    const user = await db.user.findUnique({ where: { email } });
    if (!user?.passwordHash) {
      return NextResponse.json({ status: "invalid" });
    }

    const valid = await verifyPassword(body.password, user.passwordHash);
    if (!valid) {
      return NextResponse.json({ status: "invalid" });
    }

    if (user.banned) {
      return NextResponse.json({
        status: "banned",
        banReason: user.banReason,
        messageKey: user.banReason ? banReasonI18nKey(user.banReason) : "bannedGeneric",
      });
    }

    return NextResponse.json({ status: "ok" });
  } catch {
    return NextResponse.json({ error: "invalid_data" }, { status: 400 });
  }
}
);
