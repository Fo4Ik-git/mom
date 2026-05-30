import { getComponentLogger, getLogger } from "@/lib/logger/index";
import { serializeError } from "@/lib/logger/serialize";

export { serializeError };

export const logger = {
  get log() {
    return getLogger();
  },
  child(component: string) {
    return getComponentLogger(component);
  },
  error(event: string, error: unknown, fields?: Record<string, unknown>) {
    getLogger().error({ event, err: serializeError(error), ...fields });
  },
  warn(event: string, fields?: Record<string, unknown>) {
    getLogger().warn({ event, ...fields });
  },
  info(event: string, fields?: Record<string, unknown>) {
    getLogger().info({ event, ...fields });
  },
  debug(event: string, fields?: Record<string, unknown>) {
    getLogger().debug({ event, ...fields });
  },
};
