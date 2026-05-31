import { describe, expect, it } from "vitest";
import { extractScriptFromLlmResponse } from "@/lib/ai/extract-script";

describe("extractScriptFromLlmResponse", () => {
  it("returns plain script as-is", () => {
    const script = 'input field_a { label = "A" }';
    expect(extractScriptFromLlmResponse(script)).toBe(script);
  });

  it("strips markdown calc fence", () => {
    const inner = "output output_total { label = \"T\" }";
    const wrapped = "```calc\n" + inner + "\n```";
    expect(extractScriptFromLlmResponse(wrapped)).toBe(inner);
  });
});
