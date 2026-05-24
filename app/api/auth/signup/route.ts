import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/password";
import { isAllowedFrontendRequest } from "@/lib/api-security";

const signupSchema = z.object({
  name: z.string().min(1).max(80).optional(),
  email: z.string().email(),
  password: z.string().min(8).max(128),
});

export async function POST(request: Request) {
  if (!isAllowedFrontendRequest(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  try {
    const body = signupSchema.parse(await request.json());
    const email = body.email.toLowerCase();

    const existing = await db.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json(
        { error: "email_exists" },
        { status: 409 },
      );
    }

    const passwordHash = await hashPassword(body.password);

    await db.user.create({
      data: {
        email,
        name: body.name,
        passwordHash,
        emailVerified: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }
    return NextResponse.json({ error: "signup_failed" }, { status: 500 });
  }
}
