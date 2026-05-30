import { initLogger, getLogger } from "@/lib/logger/index";
import { serializeError } from "@/lib/logger/serialize";

let hooksRegistered = false;

export function registerProcessLogHooks(): void {
  if (hooksRegistered) {
    return;
  }
  hooksRegistered = true;

  const logger = getLogger();

  process.on("uncaughtException", (error) => {
    logger.fatal({ event: "process.uncaught_exception", err: serializeError(error) });
  });

  process.on("unhandledRejection", (reason) => {
    logger.fatal({
      event: "process.unhandled_rejection",
      err: serializeError(reason),
    });
  });
}

export function bootstrapLogger(): void {
  initLogger();
  registerProcessLogHooks();
}
