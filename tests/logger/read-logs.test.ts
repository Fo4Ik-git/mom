import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

describe("read-logs", () => {
  let tmpDir: string;
  const env = { ...process.env };

  beforeEach(() => {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "mom-logs-"));
    process.env.LOG_DIR = tmpDir;
    vi.resetModules();
  });

  afterEach(() => {
    process.env = { ...env };
    fs.rmSync(tmpDir, { recursive: true, force: true });
  });

  it("rejects path traversal filenames", async () => {
    const { isValidLogFileName, resolveLogFilePath } = await import(
      "@/lib/logger/read-logs"
    );
    expect(isValidLogFileName("../secret.jsonl")).toBe(false);
    expect(isValidLogFileName("app-2026-05-30.jsonl")).toBe(true);
    expect(resolveLogFilePath("../../etc/passwd")).toBeNull();
  });

  it("reads and filters tail entries", async () => {
    const file = path.join(tmpDir, "app-2026-05-30.jsonl");
    const lines = [
      JSON.stringify({
        level: "info",
        time: "2026-05-30T10:00:00.000Z",
        trace_id: "trace-a",
        event: "http.request.end",
        msg: "ok",
      }),
      JSON.stringify({
        level: "error",
        time: "2026-05-30T10:01:00.000Z",
        trace_id: "trace-b",
        event: "http.request.error",
        msg: "failed",
      }),
    ];
    fs.writeFileSync(file, `${lines.join("\n")}\n`);

    const { readLogs } = await import("@/lib/logger/read-logs");
    const all = readLogs({ file: "app-2026-05-30.jsonl", limit: 10 });
    expect(all?.entries).toHaveLength(2);
    expect(all?.entries[0]?.trace_id).toBe("trace-b");

    const filtered = readLogs({
      file: "app-2026-05-30.jsonl",
      q: "trace-a",
      limit: 10,
    });
    expect(filtered?.entries).toHaveLength(1);
    expect(filtered?.entries[0]?.level).toBe("info");

    const byEmail = readLogs({
      file: "app-2026-05-30.jsonl",
      q: "target@example.com",
      limit: 10,
    });
    expect(byEmail?.entries).toHaveLength(0);

    const withNested = readLogs({
      file: "app-2026-05-30.jsonl",
      q: "failed",
      limit: 10,
    });
    expect(withNested?.entries).toHaveLength(1);
  });
});
