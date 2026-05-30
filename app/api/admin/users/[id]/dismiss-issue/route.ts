import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/lib/db";
import { handleAdminApiError } from "@/lib/admin-api-response";
import { requireAdmin } from "@/lib/auth-session";
import {
  isBanIssueVisible,
  isExpiredAccessIssueVisible,
} from "@/lib/admin-issues";

const bodySchema = z.object({
  kind: z.enum(["banned", "expired"]),
});

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { kind } = bodySchema.parse(await request.json());

    const user = await db.user.findUnique({
      where: { id },
      select: {
        banned: true,
        role: true,
        accessExpiresAt: true,
        issueBanDismissedAt: true,
        issueExpiredDismissedFor: true,
      },
    });

    if (!user) {
      return NextResponse.json({ error: "not_found" }, { status: 404 });
    }

    if (kind === "banned") {
      if (!isBanIssueVisible(user)) {
        return NextResponse.json({ error: "nothing_to_dismiss" }, { status: 400 });
      }

      await db.user.update({
        where: { id },
        data: { issueBanDismissedAt: new Date() },
      });
    } else {
      if (!isExpiredAccessIssueVisible(user)) {
        return NextResponse.json({ error: "nothing_to_dismiss" }, { status: 400 });
      }

      await db.user.update({
        where: { id },
        data: { issueExpiredDismissedFor: user.accessExpiresAt },
      });
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "invalid_data" }, { status: 400 });
    }
    return handleAdminApiError(error, "admin/users/[id]/dismiss-issue");
  }
}
