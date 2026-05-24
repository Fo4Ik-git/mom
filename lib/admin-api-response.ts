import { Prisma } from "@prisma/client";
import { NextResponse } from "next/server";

export function isPrismaClientError(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError ||
    error instanceof Prisma.PrismaClientUnknownRequestError ||
    error instanceof Prisma.PrismaClientValidationError ||
    error instanceof Prisma.PrismaClientInitializationError ||
    error instanceof Prisma.PrismaClientRustPanicError
  );
}

export function handleAdminApiError(
  error: unknown,
  logTag?: string,
): NextResponse {
  if (error instanceof Error && error.message === "Forbidden") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  if (isPrismaClientError(error)) {
    if (logTag) {
      console.error(`[${logTag}]`, error);
    }
    return NextResponse.json({ error: "database_error" }, { status: 503 });
  }

  if (logTag) {
    console.error(`[${logTag}]`, error);
  }
  return NextResponse.json({ error: "server_error" }, { status: 500 });
}
