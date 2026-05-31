import { NextResponse } from "next/server";
import { handleAdminApiError } from "@/lib/admin/admin-api-response";
import { requireAdmin } from "@/lib/auth/auth-session";
import { withApiRoute } from "@/lib/api/with-api-route";
import { parseLogPage, parseLogPageSize } from "@/lib/logger/log-pagination";
import { listLogFileMeta, readLogs, type LogLevel } from "@/lib/logger/read-logs";

const LEVELS = new Set<LogLevel>([
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
]);

function parseLevel(value: string | null): LogLevel | undefined {
  if (!value) {
    return undefined;
  }
  const level = value.toLowerCase() as LogLevel;
  return LEVELS.has(level) ? level : undefined;
}

export const GET = withApiRoute(async function GET(request: Request) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(request.url);
    const file = searchParams.get("file");

    if (!file) {
      return NextResponse.json({
        files: listLogFileMeta(),
        logDir: process.env.LOG_DIR ?? "logs",
        retentionDays: Number.parseInt(
          process.env.LOG_RETENTION_DAYS ?? "14",
          10,
        ),
      });
    }

    const page = parseLogPage(
      Number.parseInt(searchParams.get("page") ?? "1", 10),
    );
    const pageSize = parseLogPageSize(
      Number.parseInt(
        searchParams.get("pageSize") ??
          searchParams.get("limit") ??
          String(50),
        10,
      ),
    );
    const result = readLogs({
      file,
      q: searchParams.get("q") ?? undefined,
      level: parseLevel(searchParams.get("level")),
      traceId: searchParams.get("trace_id") ?? undefined,
      event: searchParams.get("event") ?? undefined,
      actionsOnly: searchParams.get("actionsOnly") === "1",
      page,
      pageSize,
    });

    if (!result) {
      return NextResponse.json({ error: "file_not_found" }, { status: 404 });
    }

    return NextResponse.json(result);
  } catch (error) {
    return handleAdminApiError(error, "admin/audit");
  }
});
