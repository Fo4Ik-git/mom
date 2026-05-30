import { describe, expect, it } from "vitest";
import {
  buildLogSearchBlob,
  matchesLogSearch,
  mergeLogSearchQuery,
} from "@/lib/logger/log-search";

describe("log-search", () => {
  it("finds nested user email and target ids", () => {
    const blob = buildLogSearchBlob({
      trace_id: "trace-abc",
      user: { id: "u1", email: "admin@test.com" },
      target_user_id: "u2",
      calculator_id: "calc-99",
      changes: { banned: true },
    });

    expect(matchesLogSearch(blob, "admin@test.com")).toBe(true);
    expect(matchesLogSearch(blob, "u2")).toBe(true);
    expect(matchesLogSearch(blob, "calc-99")).toBe(true);
    expect(matchesLogSearch(blob, "trace-abc")).toBe(true);
    expect(matchesLogSearch(blob, "missing")).toBe(false);
  });

  it("merges q and legacy trace_id param", () => {
    expect(mergeLogSearchQuery("email@test.com", "trace-1")).toBe(
      "email@test.com trace-1",
    );
  });
});
