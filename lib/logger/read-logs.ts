import "server-only";

import fs from "node:fs";
import path from "node:path";
import { logConfig } from "@/lib/logger/config";
import {
  buildLogSearchBlob,
  matchesLogSearch,
  mergeLogSearchQuery,
} from "@/lib/logger/log-search";
import {
  buildLogPagination,
  parseLogPage,
  parseLogPageSize,
} from "@/lib/logger/log-pagination";
import type { TablePagination } from "@/lib/ui/table-pagination";

export {
  LOG_PAGE_SIZES,
  DEFAULT_LOG_PAGE_SIZE,
  parseLogPage,
  parseLogPageSize,
  type LogPageSize,
} from "@/lib/logger/log-pagination";

const LOG_FILE_RE = /^app-\d{4}-\d{2}-\d{2}\.jsonl$/;
const DEFAULT_MAX_BYTES = 2 * 1024 * 1024;

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

export type LogFileMeta = {
  name: string;
  date: string;
  sizeBytes: number;
  updatedAt: string;
};

export type LogEntry = {
  lineNumber: number;
  time?: string;
  level?: string;
  trace_id?: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  user_role?: string;
  action?: string;
  event?: string;
  path?: string;
  status?: number;
  duration_ms?: number;
  msg?: string;
  component?: string;
  calculator_id?: string;
  target_user_id?: string;
  share_user_id?: string;
  access_key_id?: string;
  raw: string;
};

export type ReadLogsOptions = {
  file: string;
  q?: string;
  level?: LogLevel;
  traceId?: string;
  event?: string;
  /** @deprecated Use page + pageSize */
  limit?: number;
  page?: number;
  pageSize?: number;
  maxBytes?: number;
};

export type ReadLogsResult = {
  file: string;
  entries: LogEntry[];
  matchedCount: number;
  truncated: boolean;
  scannedBytes: number;
  fileSizeBytes: number;
  pagination: TablePagination;
};

export function isValidLogFileName(name: string): boolean {
  return LOG_FILE_RE.test(name);
}

export function resolveLogFilePath(name: string): string | null {
  if (!isValidLogFileName(name)) {
    return null;
  }
  const dir = path.resolve(logConfig.dir);
  const resolved = path.resolve(dir, name);
  const relative = path.relative(dir, resolved);
  if (relative.startsWith("..") || path.isAbsolute(relative)) {
    return null;
  }
  return resolved;
}

export function listLogFileMeta(): LogFileMeta[] {
  if (!fs.existsSync(logConfig.dir)) {
    return [];
  }

  return fs
    .readdirSync(logConfig.dir)
    .filter((name) => isValidLogFileName(name))
    .map((name) => {
      const fullPath = path.join(logConfig.dir, name);
      const stat = fs.statSync(fullPath);
      const date = name.slice(4, 14);
      return {
        name,
        date,
        sizeBytes: stat.size,
        updatedAt: stat.mtime.toISOString(),
      };
    })
    .sort((a, b) => b.date.localeCompare(a.date));
}

function pickString(row: Record<string, unknown>, key: string): string | undefined {
  const value = row[key];
  return typeof value === "string" ? value : undefined;
}

function pickNestedId(
  row: Record<string, unknown>,
  key: string,
): string | undefined {
  const nested = row[key];
  if (nested && typeof nested === "object" && "id" in nested) {
    const id = (nested as Record<string, unknown>).id;
    return typeof id === "string" ? id : undefined;
  }
  return undefined;
}

function parseLogLine(
  raw: string,
  lineNumber: number,
): { entry: LogEntry; searchBlob: string } | null {
  const trimmed = raw.trim();
  if (!trimmed) {
    return null;
  }

  try {
    const row = JSON.parse(trimmed) as Record<string, unknown>;
    const http =
      row.http && typeof row.http === "object" ?
        (row.http as Record<string, unknown>)
      : null;
    const user =
      row.user && typeof row.user === "object" ?
        (row.user as Record<string, unknown>)
      : null;

    const entry: LogEntry = {
      lineNumber,
      time: typeof row.time === "string" ? row.time : undefined,
      level: typeof row.level === "string" ? row.level : undefined,
      trace_id: typeof row.trace_id === "string" ? row.trace_id : undefined,
      user_id:
        typeof user?.id === "string" ? user.id
        : typeof row.user_id === "string" ? row.user_id
        : undefined,
      user_email: typeof user?.email === "string" ? user.email : undefined,
      user_name: typeof user?.name === "string" ? user.name : undefined,
      user_role: typeof user?.role === "string" ? user.role : undefined,
      action: typeof row.action === "string" ? row.action : undefined,
      event: typeof row.event === "string" ? row.event : undefined,
      path:
        typeof http?.path === "string" ? http.path
        : typeof row.path === "string" ? row.path
        : undefined,
      status:
        typeof http?.status_code === "number" ? http.status_code
        : typeof http?.status === "number" ? http.status
        : typeof row.status === "number" ? row.status
        : undefined,
      duration_ms:
        typeof http?.duration_ms === "number" ? http.duration_ms
        : typeof row.duration_ms === "number" ? row.duration_ms
        : undefined,
      msg: typeof row.msg === "string" ? row.msg : undefined,
      component: typeof row.component === "string" ? row.component : undefined,
      calculator_id:
        pickString(row, "calculator_id") ?? pickNestedId(row, "calculator"),
      target_user_id:
        pickString(row, "target_user_id") ?? pickNestedId(row, "target_user"),
      share_user_id: pickString(row, "share_user_id"),
      access_key_id: pickString(row, "access_key_id"),
      raw: trimmed,
    };
    return { entry, searchBlob: buildLogSearchBlob(row) };
  } catch {
    const entry: LogEntry = {
      lineNumber,
      raw: trimmed,
      msg: trimmed,
    };
    return { entry, searchBlob: trimmed.toLowerCase() };
  }
}

function matchesFilters(
  entry: LogEntry,
  searchBlob: string,
  filters: {
    q?: string;
    level?: LogLevel;
    event?: string;
  },
): boolean {
  if (filters.level && entry.level !== filters.level) {
    return false;
  }
  if (filters.event && entry.event !== filters.event) {
    return false;
  }
  if (filters.q && !matchesLogSearch(searchBlob, filters.q)) {
    return false;
  }
  return true;
}

function readTailBuffer(filePath: string, maxBytes: number): {
  buffer: Buffer;
  truncated: boolean;
  scannedBytes: number;
  fileSizeBytes: number;
} {
  const stat = fs.statSync(filePath);
  const fileSizeBytes = stat.size;
  if (fileSizeBytes === 0) {
    return {
      buffer: Buffer.alloc(0),
      truncated: false,
      scannedBytes: 0,
      fileSizeBytes: 0,
    };
  }

  const scannedBytes = Math.min(fileSizeBytes, maxBytes);
  const truncated = scannedBytes < fileSizeBytes;
  const start = fileSizeBytes - scannedBytes;

  const fd = fs.openSync(filePath, "r");
  try {
    const buffer = Buffer.alloc(scannedBytes);
    fs.readSync(fd, buffer, 0, scannedBytes, start);
    return { buffer, truncated, scannedBytes, fileSizeBytes };
  } finally {
    fs.closeSync(fd);
  }
}

/** Reads recent log lines (from file tail), newest first. */
export function readLogs(options: ReadLogsOptions): ReadLogsResult | null {
  const filePath = resolveLogFilePath(options.file);
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  const pageSize = parseLogPageSize(options.pageSize ?? options.limit);
  const page = parseLogPage(options.page);
  const skip = (page - 1) * pageSize;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const filters = {
    q: mergeLogSearchQuery(options.q, options.traceId),
    level: options.level,
    event: options.event?.trim() || undefined,
  };

  const { buffer, truncated, scannedBytes, fileSizeBytes } = readTailBuffer(
    filePath,
    maxBytes,
  );

  const text = buffer.toString("utf8");
  const lines = text.split("\n");
  if (truncated && lines.length > 0) {
    lines.shift();
  }

  const entries: LogEntry[] = [];
  let matchedCount = 0;
  const startLine = Math.max(
    1,
    fileSizeBytes > 0
      ? Math.max(1, Math.floor((fileSizeBytes - scannedBytes) / 80))
      : 1,
  );

  for (let i = lines.length - 1; i >= 0; i--) {
    const lineNumber = startLine + i;
    const parsed = parseLogLine(lines[i] ?? "", lineNumber);
    if (!parsed) {
      continue;
    }
    if (!matchesFilters(parsed.entry, parsed.searchBlob, filters)) {
      continue;
    }
    const matchIndex = matchedCount;
    matchedCount++;
    if (matchIndex < skip) {
      continue;
    }
    if (entries.length >= pageSize) {
      continue;
    }
    entries.push(parsed.entry);
  }

  const pagination = buildLogPagination(page, pageSize, matchedCount);

  return {
    file: options.file,
    entries,
    matchedCount,
    truncated,
    scannedBytes,
    fileSizeBytes,
    pagination,
  };
}
