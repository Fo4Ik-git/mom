import type { AiChatMessage } from "@/lib/ai/chat-types";
import { formatCalculatorScript } from "@/lib/calculator/script/format";
import type { CalculatorConfig } from "@/types/calculator";

function wrapUserMessageWithCurrentScript(script: string, userText: string): string {
  return [
    "The user is editing an EXISTING calculator in the builder.",
    "Output the FULL updated script (not a diff, not commentary).",
    "Keep ids stable when possible; change only what the user asks for.",
    "",
    "Current script:",
    script,
    "",
    "---",
    "",
    "User request:",
    userText,
  ].join("\n");
}

/** Attach live builder config to the latest user turn so AI can revise an existing calculator. */
export function prepareAiChatMessages(
  messages: AiChatMessage[],
  baseConfig?: CalculatorConfig,
): AiChatMessage[] {
  if (!baseConfig || messages.length === 0) {
    return messages;
  }

  const script = formatCalculatorScript(baseConfig).trim();
  if (!script) {
    return messages;
  }

  let lastUserIndex = -1;
  for (let i = messages.length - 1; i >= 0; i -= 1) {
    if (messages[i]?.role === "user") {
      lastUserIndex = i;
      break;
    }
  }
  if (lastUserIndex < 0) {
    return messages;
  }

  return messages.map((message, index) =>
    index === lastUserIndex
      ? {
          ...message,
          content: wrapUserMessageWithCurrentScript(script, message.content),
        }
      : message,
  );
}
