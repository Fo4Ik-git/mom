import path from "node:path";

export type LogLevel = "fatal" | "error" | "warn" | "info" | "debug" | "trace";

function parseRetentionDays(raw: string | undefined): number {
  const value = Number.parseInt(raw ?? "14", 10);
  if (!Number.isFinite(value) || value < 1) {
    return 14;
  }
  return Math.min(value, 365);
}

function parseLogLevel(raw: string | undefined): LogLevel {
  const level = (raw ?? (process.env.NODE_ENV === "production" ? "info" : "debug")).toLowerCase();
  if (
    level === "fatal" ||
    level === "error" ||
    level === "warn" ||
    level === "info" ||
    level === "debug" ||
    level === "trace"
  ) {
    return level;
  }
  return "info";
}

const defaultLogDir = path.join(/* turbopackIgnore: true */ process.cwd(), "logs");

export const logConfig = {
  dir: process.env.LOG_DIR
    ? path.resolve(process.env.LOG_DIR)
    : defaultLogDir,
  retentionDays: parseRetentionDays(process.env.LOG_RETENTION_DAYS),
  level: parseLogLevel(process.env.LOG_LEVEL),
  /** Also mirror JSON logs to stdout (useful in dev / docker logs). */
  toStdout: process.env.LOG_TO_STDOUT !== "false",
  service: process.env.LOG_SERVICE ?? "calculator",
  env: process.env.NODE_ENV ?? "development",
} as const;
