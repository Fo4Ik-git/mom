import type { NextRequest } from "next/server";
import { handlers } from "@/auth";
import { withApiRoute } from "@/lib/api/with-api-route";

export const GET = withApiRoute((request) =>
  handlers.GET(request as NextRequest),
);
export const POST = withApiRoute((request) =>
  handlers.POST(request as NextRequest),
);
