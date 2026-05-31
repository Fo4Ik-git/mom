"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useTranslations } from "next-intl";
import { AiChatPanel } from "@/app/components/builder/ai-chat-panel";
import type { AiQuotaSnapshot } from "@/lib/ai/token-usage-types";
import type { CalculatorConfig } from "@/types/calculator";

const STORAGE_KEY = "builder-ai-chat-sidebar-width";
const DEFAULT_WIDTH = 380;
const MIN_WIDTH = 300;
const MAX_WIDTH = 520;

function clampWidth(value: number) {
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, value));
}

interface AiChatSidebarProps {
  config: CalculatorConfig;
  calculatorId?: string;
  initialQuota?: AiQuotaSnapshot | null;
  disabled?: boolean;
  onClose: () => void;
  onApply: (config: CalculatorConfig, script: string) => void;
}

export function AiChatSidebar({
  config,
  calculatorId,
  initialQuota,
  disabled,
  onClose,
  onApply,
}: AiChatSidebarProps) {
  const t = useTranslations("builder.ai");
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const widthRef = useRef(width);
  widthRef.current = width;

  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) {
      return;
    }
    const parsed = Number(stored);
    if (Number.isFinite(parsed)) {
      setWidth(clampWidth(parsed));
    }
  }, []);

  const handleResizePointerDown = useCallback(
    (event: React.PointerEvent<HTMLDivElement>) => {
      event.preventDefault();
      const startX = event.clientX;
      const startWidth = widthRef.current;
      const handle = event.currentTarget;
      handle.setPointerCapture(event.pointerId);

      const onMove = (moveEvent: PointerEvent) => {
        setWidth(clampWidth(startWidth + (moveEvent.clientX - startX)));
      };

      const onUp = (upEvent: PointerEvent) => {
        handle.releasePointerCapture(upEvent.pointerId);
        localStorage.setItem(STORAGE_KEY, String(widthRef.current));
        handle.removeEventListener("pointermove", onMove);
        handle.removeEventListener("pointerup", onUp);
        handle.removeEventListener("pointercancel", onUp);
      };

      handle.addEventListener("pointermove", onMove);
      handle.addEventListener("pointerup", onUp);
      handle.addEventListener("pointercancel", onUp);
    },
    [],
  );

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === "Escape") {
        onClose();
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  return (
    <aside
      aria-label={t("sheetTitle")}
      style={{ width }}
      className="relative sticky top-16 z-20 flex h-[calc(100dvh-4rem)] shrink-0 flex-col border-r border-border bg-card shadow-sm"
    >
      <div
        role="separator"
        aria-orientation="vertical"
        aria-label={t("sheetResize")}
        onPointerDown={handleResizePointerDown}
        className="absolute inset-y-0 right-0 z-10 w-2 translate-x-1/2 cursor-ew-resize touch-none before:absolute before:inset-y-0 before:left-1/2 before:w-px before:-translate-x-1/2 before:bg-border hover:before:bg-accent/60 active:before:bg-accent"
      />
      <header className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0">
          <h3 className="text-base font-semibold text-foreground">{t("sheetTitle")}</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {calculatorId ? t("sheetSubtitleExisting") : t("sheetSubtitleNew")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="flex size-9 shrink-0 items-center justify-center rounded-lg text-lg text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label={t("sheetClose")}
        >
          ×
        </button>
      </header>
      <AiChatPanel
        disabled={disabled}
        config={config}
        calculatorId={calculatorId}
        initialQuota={initialQuota}
        onApply={onApply}
      />
    </aside>
  );
}
