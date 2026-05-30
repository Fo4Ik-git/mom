import "server-only";

import fs from "node:fs";
import path from "node:path";
import pino, { type Logger } from "pino";
import * as rfs from "rotating-file-stream";
import { logConfig } from "@/lib/logger/config";
import { getRequestContext } from "@/lib/logger/context";

let rootLogger: Logger | null = null;

function dailyLogFilename(time: Date | number): string {
  const date = time instanceof Date ? time : new Date(time);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `app-${y}-${m}-${d}.jsonl`;
}

export function initLogger(): Logger {
  if (rootLogger) {
    return rootLogger;
  }

  fs.mkdirSync(logConfig.dir, { recursive: true });

  const fileStream = rfs.createStream(
    (time) => (time ? dailyLogFilename(time) : dailyLogFilename(new Date())),
    {
      path: logConfig.dir,
      interval: "1d",
      maxFiles: logConfig.retentionDays,
      initialRotation: true,
    },
  );

  const streams: pino.StreamEntry[] = [{ stream: fileStream, level: logConfig.level }];
  if (logConfig.toStdout) {
    streams.push({
      stream: pino.destination({ dest: 1, sync: false }),
      level: logConfig.level,
    });
  }

  rootLogger = pino(
    {
      level: logConfig.level,
      base: {
        service: logConfig.service,
        env: logConfig.env,
        pid: process.pid,
      },
      timestamp: pino.stdTimeFunctions.isoTime,
      formatters: {
        level(label) {
          return { level: label };
        },
      },
      mixin() {
        const ctx = getRequestContext();
        if (!ctx) {
          return {};
        }
        return {
          trace_id: ctx.traceId,
          ...(ctx.user ? { user: ctx.user } : ctx.userId ? { user_id: ctx.userId } : {}),
        };
      },
    },
    pino.multistream(streams),
  );

  rootLogger.debug(
    {
      event: "logger.started",
      log_dir: logConfig.dir,
      retention_days: logConfig.retentionDays,
      level: logConfig.level,
    },
    "application logger ready",
  );

  return rootLogger;
}

export function getLogger(): Logger {
  return rootLogger ?? initLogger();
}

/** Child logger with a stable component name (e.g. prisma, auth). */
export function getComponentLogger(component: string): Logger {
  return getLogger().child({ component });
}

export function logDirPath(): string {
  return logConfig.dir;
}

export function listLogFiles(): string[] {
  if (!fs.existsSync(logConfig.dir)) {
    return [];
  }
  return fs
    .readdirSync(logConfig.dir)
    .filter((name) => name.startsWith("app-") && name.endsWith(".jsonl"))
    .sort()
    .map((name) => path.join(logConfig.dir, name));
}
