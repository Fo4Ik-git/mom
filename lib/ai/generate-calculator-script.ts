import "server-only";

import type { AiChatMessage } from "@/lib/ai/chat-types";
import { extractScriptFromLlmResponse } from "@/lib/ai/extract-script";
import {
  generateCalculatorScriptWithGemini,
  generateCalculatorScriptWithGeminiChat,
} from "@/lib/ai/gemini";
import { normalizeAiCalculatorScript } from "@/lib/ai/normalize-ai-script";
import { prepareAiChatMessages } from "@/lib/ai/prepare-chat-messages";
import { finalizeConfig } from "@/lib/calculator/config/sync";
import { parseCalculatorScript } from "@/lib/calculator/script/parse";
import type { CalculatorConfig } from "@/types/calculator";

const AUTO_TOTAL_SUFFIX = "total";

export type GenerateCalculatorScriptResult =
  | {
      ok: true;
      script: string;
      config: CalculatorConfig;
      usedCache: boolean;
    }
  | {
      ok: false;
      script: string;
      errors: Array<{ message: string; line: number; file?: string }>;
      usedCache: boolean;
    };

async function generateRawScript(
  messages: AiChatMessage[],
  baseConfig?: CalculatorConfig,
): Promise<{ text: string; usedCache: boolean }> {
  const prepared = prepareAiChatMessages(messages, baseConfig);
  if (prepared.length === 1 && prepared[0]?.role === "user" && !baseConfig) {
    return generateCalculatorScriptWithGemini(prepared[0].content);
  }
  return generateCalculatorScriptWithGeminiChat(prepared);
}

async function parseGeneratedScript(
  raw: string,
  baseConfig: CalculatorConfig | undefined,
  usedCache: boolean,
): Promise<GenerateCalculatorScriptResult> {
  let lastScript = normalizeAiCalculatorScript(extractScriptFromLlmResponse(raw));
  let parsed = parseCalculatorScript(lastScript, baseConfig);

  if (!parsed.config || parsed.errors.length > 0) {
    const fixHint = parsed.errors
      .map((e) => `${e.file ? `${e.file}:` : ""}${e.line} ${e.message}`)
      .join("; ");
    const { text: fixRaw } = await generateCalculatorScriptWithGemini(
      `Fix this calculator script. Parser errors: ${fixHint}\n\nRules: use .qty in formulas; one line per local/return; no markdown.\n\nScript:\n${lastScript}`,
    );
    lastScript = normalizeAiCalculatorScript(extractScriptFromLlmResponse(fixRaw));
    parsed = parseCalculatorScript(lastScript, baseConfig);
  }

  if (!parsed.config || parsed.errors.length > 0) {
    return {
      ok: false,
      script: lastScript,
      errors: parsed.errors,
      usedCache,
    };
  }

  const config = finalizeConfig(parsed.config, AUTO_TOTAL_SUFFIX);
  return { ok: true, script: lastScript, config, usedCache };
}

export async function generateCalculatorFromChat(
  messages: AiChatMessage[],
  baseConfig?: CalculatorConfig,
): Promise<GenerateCalculatorScriptResult> {
  const normalized = messages
    .map((m) => ({ role: m.role, content: m.content.trim() }))
    .filter((m) => m.content.length > 0);

  if (normalized.length === 0) {
    throw new Error("Prompt is required");
  }

  const { text: raw, usedCache } = await generateRawScript(normalized, baseConfig);
  return parseGeneratedScript(raw, baseConfig, usedCache);
}

export async function generateCalculatorFromPrompt(
  prompt: string,
  baseConfig?: CalculatorConfig,
): Promise<GenerateCalculatorScriptResult> {
  const trimmed = prompt.trim();
  if (!trimmed) {
    throw new Error("Prompt is required");
  }

  return generateCalculatorFromChat([{ role: "user", content: trimmed }], baseConfig);
}
