import "server-only";

import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: ReturnType<typeof createPrismaClient> | undefined;
};

const SLOW_QUERY_MS = Number.parseInt(process.env.LOG_SLOW_QUERY_MS ?? "200", 10);

function logSlowQuery(fields: {
  model?: string;
  operation: string;
  durationMs: number;
}) {
  void import("@/lib/logger/index").then(({ getComponentLogger }) => {
    getComponentLogger("prisma").warn(
      {
        event: "db.query.slow",
        model: fields.model,
        operation: fields.operation,
        duration_ms: fields.durationMs,
      },
      "slow database query",
    );
  });
}

function createPrismaClient() {
  const base = new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

  return base.$extends({
    query: {
      $allOperations({ operation, model, args, query }) {
        const start = performance.now();
        return query(args).then((result) => {
          const durationMs = Math.round(performance.now() - start);
          if (durationMs >= SLOW_QUERY_MS) {
            logSlowQuery({ model, operation, durationMs });
          }
          return result;
        });
      },
    },
  });
}

export const db = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
