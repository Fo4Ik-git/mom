import type { AiChatMessage } from "@/lib/ai/chat-types";

const DRAFT_KEY = "mcb-ai-chat-draft-v1";

export type StoredChatEntry = AiChatMessage & { id: string };

export function loadDraftChatMessages(): StoredChatEntry[] {
  if (typeof window === "undefined") {
    return [];
  }
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) {
      return [];
    }
    const parsed = JSON.parse(raw) as StoredChatEntry[];
    if (!Array.isArray(parsed)) {
      return [];
    }
    return parsed.filter(
      (entry) =>
        (entry.role === "user" || entry.role === "assistant") &&
        typeof entry.content === "string" &&
        typeof entry.id === "string",
    );
  } catch {
    return [];
  }
}

export function saveDraftChatMessages(messages: StoredChatEntry[]): void {
  if (typeof window === "undefined") {
    return;
  }
  if (messages.length === 0) {
    localStorage.removeItem(DRAFT_KEY);
    return;
  }
  localStorage.setItem(DRAFT_KEY, JSON.stringify(messages.slice(-80)));
}

export function clearDraftChatMessages(): void {
  if (typeof window === "undefined") {
    return;
  }
  localStorage.removeItem(DRAFT_KEY);
}
