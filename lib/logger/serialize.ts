export function serializeError(error: unknown): Record<string, unknown> {
  if (error instanceof Error) {
    return {
      name: error.name,
      message: error.message,
      stack: error.stack,
      ...(error.cause instanceof Error
        ? { cause: serializeError(error.cause) }
        : error.cause !== undefined
          ? { cause: error.cause }
          : {}),
    };
  }
  return { message: String(error) };
}
