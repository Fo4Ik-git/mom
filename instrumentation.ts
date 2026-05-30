export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { bootstrapLogger } = await import("@/lib/logger/init");
    bootstrapLogger();
  }
}
