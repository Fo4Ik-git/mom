"use client";

import { useCallback, useEffect, useId, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Button } from "@/app/components/ui/button";
import { appFetch } from "@/lib/api/api-client";
import type { AiChatMessage } from "@/lib/ai/chat-types";
import {
  clearDraftChatMessages,
  loadDraftChatMessages,
  saveDraftChatMessages,
  type StoredChatEntry,
} from "@/lib/ai/ai-chat-draft-client";
import type { AiQuotaSnapshot } from "@/lib/ai/token-usage-types";
import type { CalculatorConfig } from "@/types/calculator";
import { formatAccessDateShort } from "@/lib/access/access-dates";

type GenerateOk = {
  ok: true;
  script: string;
  config: CalculatorConfig;
};

type GenerateFail = {
  ok: false;
  script: string;
  errors: Array<{ message: string; line: number; file?: string }>;
};

type ChatEntry = StoredChatEntry;

function newEntry(role: AiChatMessage["role"], content: string): ChatEntry {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

function toPersistPayload(messages: ChatEntry[]): AiChatMessage[] {
  return messages.map(({ role, content }) => ({ role, content }));
}

export function AiChatPanel({
  disabled,
  config,
  calculatorId,
  initialQuota,
  onApply,
  onQuotaUpdate,
}: {
  disabled?: boolean;
  config: CalculatorConfig;
  calculatorId?: string;
  initialQuota?: AiQuotaSnapshot | null;
  onApply: (config: CalculatorConfig, script: string) => void;
  onQuotaUpdate?: (quota: AiQuotaSnapshot) => void;
}) {
  const t = useTranslations("builder.ai");
  const locale = useLocale();
  const promptId = useId();
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(Boolean(calculatorId));
  const [draft, setDraft] = useState("");
  const trimmedLength = draft.trim().length;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [quota, setQuota] = useState<AiQuotaSnapshot | null>(
    initialQuota ?? null,
  );

  async function refreshQuota() {
    const res = await appFetch("/api/user/ai-quota");
    if (!res.ok) {
      return;
    }
    const next = (await res.json()) as AiQuotaSnapshot;
    setQuota(next);
    onQuotaUpdate?.(next);
  }

  function scrollThreadToEnd() {
    requestAnimationFrame(() => {
      threadRef.current?.scrollTo({
        top: threadRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  const persistMessages = useCallback(
    async (nextMessages: ChatEntry[]) => {
      const payload = toPersistPayload(nextMessages);
      if (calculatorId) {
        await appFetch("/api/ai/chat", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            calculatorId,
            messages: payload,
          }),
        });
      } else {
        saveDraftChatMessages(nextMessages);
      }
    },
    [calculatorId],
  );

  useEffect(() => {
    let cancelled = false;

    async function loadHistory() {
      if (calculatorId) {
        setHistoryLoading(true);
        const res = await appFetch(
          `/api/ai/chat?calculatorId=${encodeURIComponent(calculatorId)}`,
        );
        if (cancelled) {
          return;
        }
        setHistoryLoading(false);
        if (res.ok) {
          const data = (await res.json()) as {
            messages?: Array<{ id: string; role: string; content: string }>;
          };
          const loaded = (data.messages ?? []).map((row) => ({
            id: row.id,
            role: row.role as AiChatMessage["role"],
            content: row.content,
          }));
          setMessages(loaded);
          if (loaded.length > 0) {
            scrollThreadToEnd();
          }
        }
      } else {
        setMessages(loadDraftChatMessages());
        setHistoryLoading(false);
      }
      inputRef.current?.focus();
    }

    void loadHistory();

    return () => {
      cancelled = true;
    };
  }, [calculatorId]);

  async function clearChat() {
    if (
      messages.length > 0 &&
      !window.confirm(t("chatClearConfirm"))
    ) {
      return;
    }
    if (calculatorId) {
      await appFetch(
        `/api/ai/chat?calculatorId=${encodeURIComponent(calculatorId)}`,
        { method: "DELETE" },
      );
    } else {
      clearDraftChatMessages();
    }
    setMessages([]);
    setDraft("");
    setError(null);
    setParseErrors([]);
    inputRef.current?.focus();
  }

  async function handleSend() {
    if (disabled || loading || draft.trim().length < 8) {
      return;
    }

    const userText = draft.trim();
    const nextMessages: ChatEntry[] = [...messages, newEntry("user", userText)];
    setMessages(nextMessages);
    setDraft("");
    setLoading(true);
    setError(null);
    setParseErrors([]);
    scrollThreadToEnd();

    const response = await appFetch("/api/ai/generate-calculator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: toPersistPayload(nextMessages),
        currentConfig: config,
        calculatorId,
      }),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (response.status === 503 && data.error === "ai_not_configured") {
      setError(t("notConfigured"));
      return;
    }
    if (!response.ok) {
      if (response.status === 403 && data.error === "ai_access_denied") {
        setError(t("accessDenied"));
        return;
      }
      if (response.status === 429 && data.error === "ai_quota_exceeded") {
        setError(
          t("quotaExceeded", {
            date: data.resetAt
              ? formatAccessDateShort(data.resetAt as string, locale)
              : "—",
          }),
        );
        await refreshQuota();
        return;
      }
      if (response.status === 422 && data.ok === false && Array.isArray(data.errors)) {
        const fail = data as GenerateFail;
        setParseErrors(
          fail.errors.map((e) =>
            e.file ? `${e.file}:${e.line} — ${e.message}` : `line ${e.line}: ${e.message}`,
          ),
        );
        setError(t("parseFailed"));
        await persistMessages(nextMessages);
        scrollThreadToEnd();
        return;
      }
      setError(t("requestFailed"));
      await persistMessages(nextMessages);
      return;
    }

    const ok = data as GenerateOk;
    if (!ok.ok || !ok.config) {
      setError(t("requestFailed"));
      await persistMessages(nextMessages);
      return;
    }

    const withAssistant: ChatEntry[] = [
      ...nextMessages,
      newEntry("assistant", t("chatApplied")),
    ];
    setMessages(withAssistant);
    await persistMessages(withAssistant);
    onApply(ok.config, ok.script);
    setError(null);
    setParseErrors([]);
    await refreshQuota();
    scrollThreadToEnd();
    inputRef.current?.focus();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault();
      void handleSend();
    }
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col">
      <div
        ref={threadRef}
        className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4"
      >
        {historyLoading && (
          <p className="py-8 text-center text-sm text-muted-foreground">
            {t("chatLoadingHistory")}
          </p>
        )}

        {!historyLoading && messages.length === 0 && (
          <div className="flex flex-col items-center justify-center px-2 py-10 text-center">
            <p className="text-sm font-medium text-foreground">{t("chatEmptyTitle")}</p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
              {calculatorId ? t("chatEmptyExisting") : t("chatEmptyNew")}
            </p>
            {!calculatorId && (
              <p className="mt-2 max-w-sm text-xs text-muted-foreground/80">
                {t("chatDraftHint")}
              </p>
            )}
          </div>
        )}

        {!historyLoading &&
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={
                  message.role === "user"
                    ? "max-w-[92%] rounded-2xl rounded-br-md bg-accent px-3.5 py-2.5 text-sm text-accent-foreground"
                    : "max-w-[92%] rounded-2xl rounded-bl-md border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-foreground"
                }
              >
                <p className="whitespace-pre-wrap wrap-break-word">{message.content}</p>
              </div>
            </div>
          ))}

        {loading && (
          <div className="flex justify-start">
            <div className="rounded-2xl rounded-bl-md border border-border bg-muted/50 px-3.5 py-2.5 text-sm text-muted-foreground">
              {t("chatTyping")}
            </div>
          </div>
        )}
      </div>

      {error && (
        <div className="shrink-0 border-t border-destructive/20 bg-destructive/10 px-4 py-2.5 text-sm text-destructive">
          <p>{error}</p>
          {parseErrors.length > 0 && (
            <ul className="mt-2 max-h-24 overflow-y-auto list-disc space-y-0.5 pl-4 font-mono text-xs">
              {parseErrors.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="shrink-0 border-t border-border bg-card/95 p-4 backdrop-blur-sm">
        {quota && quota.hasAccess && !quota.unlimited && quota.remaining != null && (
          <p className="mb-2 text-xs text-muted-foreground">
            {t("quotaRemaining", {
              remaining: quota.remaining.toLocaleString(),
              date: formatAccessDateShort(quota.periodEnd, locale),
            })}
          </p>
        )}
        {quota && quota.hasAccess && quota.unlimited && (
          <p className="mb-2 text-xs text-muted-foreground">{t("quotaUnlimited")}</p>
        )}
        {!historyLoading && messages.length > 0 && (
          <p className="mb-2 text-xs text-muted-foreground">
            {t("chatHistoryHint", { count: messages.length })}
          </p>
        )}
        <label htmlFor={promptId} className="sr-only">
          {t("chatInputLabel")}
        </label>
        <textarea
          ref={inputRef}
          id={promptId}
          name="ai-calculator-prompt"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={handleKeyDown}
          disabled={disabled || loading || historyLoading}
          rows={3}
          placeholder={t("chatInputPlaceholder")}
          className="w-full resize-none rounded-xl border border-border bg-input px-3.5 py-2.5 text-sm outline-none focus-visible:border-accent/50 focus-visible:ring-2 focus-visible:ring-ring/40 disabled:opacity-60"
        />
        <div className="mt-2 flex items-center justify-between gap-2">
          <span className="text-xs text-muted-foreground">
            {trimmedLength < 8
              ? t("minChars", { count: trimmedLength, min: 8 })
              : t("chatEnterSend")}
          </span>
          <div className="flex gap-2">
            {messages.length > 0 && (
              <Button
                type="button"
                variant="ghost"
                onClick={() => void clearChat()}
                disabled={disabled || loading || historyLoading}
                className="h-9 px-3 text-xs"
              >
                {t("chatNew")}
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={handleSend}
              disabled={
                disabled || loading || historyLoading || trimmedLength < 8
              }
              className="h-9 px-4"
            >
              {loading ? t("generating") : t("chatSend")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
