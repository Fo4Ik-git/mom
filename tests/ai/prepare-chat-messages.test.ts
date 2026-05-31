import { describe, expect, it } from "vitest";
import { prepareAiChatMessages } from "@/lib/ai/prepare-chat-messages";
import { emptyCalculatorConfig } from "@/lib/calculator/config/defaults";

describe("prepareAiChatMessages", () => {
  it("wraps the last user message with current script when config is provided", () => {
    const messages = [{ role: "user" as const, content: "Add a 10% markup constant" }];
    const prepared = prepareAiChatMessages(messages, emptyCalculatorConfig);
    expect(prepared[0]?.content).toContain("EXISTING calculator");
    expect(prepared[0]?.content).toContain("field_item");
    expect(prepared[0]?.content).toContain("Add a 10% markup constant");
  });
});
