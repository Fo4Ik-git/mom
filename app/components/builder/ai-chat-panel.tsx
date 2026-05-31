"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/app/components/ui/button";
import { appFetch } from "@/lib/api/api-client";
import type { AiChatMessage } from "@/lib/ai/chat-types";
import type { CalculatorConfig } from "@/types/calculator";

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

type ChatEntry = AiChatMessage & { id: string };

function newEntry(role: AiChatMessage["role"], content: string): ChatEntry {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    role,
    content,
  };
}

export function AiChatPanel({
  disabled,
  config,
  calculatorId,
  onApply,
}: {
  disabled?: boolean;
  config: CalculatorConfig;
  calculatorId?: string;
  onApply: (config: CalculatorConfig, script: string) => void;
}) {
  const t = useTranslations("builder.ai");
  const promptId = useId();
  const threadRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [messages, setMessages] = useState<ChatEntry[]>([]);
  const [draft, setDraft] = useState("");
  const trimmedLength = draft.trim().length;
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);

  function scrollThreadToEnd() {
    requestAnimationFrame(() => {
      threadRef.current?.scrollTo({
        top: threadRef.current.scrollHeight,
        behavior: "smooth",
      });
    });
  }

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function clearChat() {
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

    const response = await appFetch("/api/admin/ai/generate-calculator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        messages: nextMessages.map(({ role, content }) => ({ role, content })),
        currentConfig: config,
      }),
    });

    const data = await response.json().catch(() => ({}));
    setLoading(false);

    if (response.status === 503 && data.error === "ai_not_configured") {
      setError(t("notConfigured"));
      return;
    }
    if (!response.ok) {
      if (response.status === 422 && data.ok === false && Array.isArray(data.errors)) {
        const fail = data as GenerateFail;
        setParseErrors(
          fail.errors.map((e) =>
            e.file ? `${e.file}:${e.line} — ${e.message}` : `line ${e.line}: ${e.message}`,
          ),
        );
        setError(t("parseFailed"));
        scrollThreadToEnd();
        return;
      }
      setError(t("requestFailed"));
      return;
    }

    const ok = data as GenerateOk;
    if (!ok.ok || !ok.config) {
      setError(t("requestFailed"));
      return;
    }

    setMessages((prev) => [...prev, newEntry("assistant", t("chatApplied"))]);
    onApply(ok.config, ok.script);
    setError(null);
    setParseErrors([]);
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
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center px-2 py-10 text-center">
            <p className="text-sm font-medium text-foreground">{t("chatEmptyTitle")}</p>
            <p className="mt-2 max-w-sm text-xs leading-relaxed text-muted-foreground">
              {calculatorId ? t("chatEmptyExisting") : t("chatEmptyNew")}
            </p>
          </div>
        )}

        {messages.map((message) => (
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
          disabled={disabled || loading}
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
                onClick={clearChat}
                disabled={disabled || loading}
                className="h-9 px-3 text-xs"
              >
                {t("chatNew")}
              </Button>
            )}
            <Button
              type="button"
              variant="primary"
              onClick={handleSend}
              disabled={disabled || loading || trimmedLength < 8}
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
