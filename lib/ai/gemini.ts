import "server-only";

import type { AiChatMessage } from "@/lib/ai/chat-types";
import { buildCalculatorGeneratorSystemInstruction } from "@/lib/ai/calculator-generator-prompt";
import { getRegisteredPrimitiveIds } from "@/lib/formula/docs/formula-catalog";
import type { GeminiTokenUsage } from "@/lib/ai/token-usage-types";

const DEFAULT_MODEL = "gemini-2.0-flash";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta";

type GeminiPart = { text: string };

declare global {
  // Reuse cache name for the lifetime of this Node process (warm serverless instances).
  var __mcbGeminiCalculatorCacheName: string | undefined;
}

function getApiKey(): string {
  const key = process.env.GEMINI_API_KEY?.trim();
  if (!key) {
    throw new Error("GEMINI_API_KEY is not configured");
  }
  return key;
}

function getModel(): string {
  return process.env.GEMINI_MODEL?.trim() || DEFAULT_MODEL;
}

async function geminiFetch(path: string, body: unknown) {
  const key = getApiKey();
  const response = await fetch(`${API_BASE}${path}?key=${key}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = (await response.json()) as {
    error?: { message?: string };
    candidates?: Array<{
      content?: { parts?: GeminiPart[] };
    }>;
    usageMetadata?: {
      promptTokenCount?: number;
      candidatesTokenCount?: number;
      totalTokenCount?: number;
    };
    name?: string;
  };
  if (!response.ok) {
    throw new Error(data.error?.message ?? `Gemini API error (${response.status})`);
  }
  return data;
}

/** Persistent cache on Google's side — set GEMINI_CACHED_CONTENT to reuse across deploys. */
export async function ensureCalculatorGeminiCache(): Promise<string | null> {
  const fromEnv = process.env.GEMINI_CACHED_CONTENT?.trim();
  if (fromEnv) {
    return fromEnv;
  }
  if (globalThis.__mcbGeminiCalculatorCacheName) {
    return globalThis.__mcbGeminiCalculatorCacheName;
  }
  if (process.env.GEMINI_DISABLE_CACHE === "true") {
    return null;
  }

  try {
    const model = getModel();
    const systemInstruction = buildCalculatorGeneratorSystemInstruction();
    const data = await geminiFetch("/cachedContents", {
      model: `models/${model}`,
      displayName: `mcb-calculator-generator-p${getRegisteredPrimitiveIds().length}`,
      systemInstruction: {
        parts: [{ text: systemInstruction }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: "Acknowledge. You will only output calculator DSL scripts for user briefs.",
            },
          ],
        },
      ],
      ttl: "86400s",
    });

    const name = data.name;
    if (name) {
      globalThis.__mcbGeminiCalculatorCacheName = name;
    }
    return name ?? null;
  } catch {
    return null;
  }
}

function toGeminiRole(role: AiChatMessage["role"]): "user" | "model" {
  return role === "assistant" ? "model" : "user";
}

function buildGeminiContents(messages: AiChatMessage[]) {
  return messages.map((message) => ({
    role: toGeminiRole(message.role),
    parts: [{ text: message.content }],
  }));
}

function parseUsageMetadata(
  model: string,
  meta?: {
    promptTokenCount?: number;
    candidatesTokenCount?: number;
    totalTokenCount?: number;
  },
): GeminiTokenUsage {
  const promptTokens = meta?.promptTokenCount ?? 0;
  const completionTokens = meta?.candidatesTokenCount ?? 0;
  const totalTokens =
    meta?.totalTokenCount ?? promptTokens + completionTokens;
  return { model, promptTokens, completionTokens, totalTokens };
}

async function generateWithGeminiContents(
  contents: Array<{ role: "user" | "model"; parts: GeminiPart[] }>,
): Promise<{ text: string; usedCache: boolean; usage: GeminiTokenUsage }> {
  const model = getModel();
  const cacheName = await ensureCalculatorGeminiCache();

  const body: Record<string, unknown> = {
    contents,
    generationConfig: {
      temperature: 0.35,
      maxOutputTokens: 4096,
    },
  };

  if (cacheName) {
    body.cachedContent = cacheName;
  } else {
    body.systemInstruction = {
      parts: [{ text: buildCalculatorGeneratorSystemInstruction() }],
    };
  }

  const data = await geminiFetch(`/models/${model}:generateContent`, body);
  const text = data.candidates?.[0]?.content?.parts
    ?.map((p) => p.text)
    .join("")
    .trim();

  if (!text) {
    throw new Error("Gemini returned an empty response");
  }

  return {
    text,
    usedCache: Boolean(cacheName),
    usage: parseUsageMetadata(model, data.usageMetadata),
  };
}

export async function generateCalculatorScriptWithGemini(
  userPrompt: string,
): Promise<{ text: string; usedCache: boolean; usage: GeminiTokenUsage }> {
  return generateWithGeminiContents([
    { role: "user", parts: [{ text: userPrompt }] },
  ]);
}

export async function generateCalculatorScriptWithGeminiChat(
  messages: AiChatMessage[],
): Promise<{ text: string; usedCache: boolean; usage: GeminiTokenUsage }> {
  if (messages.length === 0) {
    throw new Error("Prompt is required");
  }
  return generateWithGeminiContents(buildGeminiContents(messages));
}
