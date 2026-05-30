"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { InputPatternId } from "@/lib/calculator/config/input-patterns";
import { INPUT_PATTERN_IDS } from "@/lib/calculator/config/input-patterns";

interface AddInputPatternMenuProps {
  onSelect: (patternId: InputPatternId, count: number) => void;
  maxCount?: number;
}

export function AddInputPatternMenu({
  onSelect,
  maxCount = 20,
}: AddInputPatternMenuProps) {
  const t = useTranslations("builder");
  const [open, setOpen] = useState(false);
  const [count, setCount] = useState(1);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) {
      return;
    }
    function handleClick(event: MouseEvent) {
      if (!rootRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  function selectPattern(patternId: InputPatternId) {
    onSelect(patternId, count);
    setOpen(false);
    setCount(1);
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="flex items-center gap-1 rounded-xl bg-accent-muted px-3 py-2 text-sm font-medium text-accent"
      >
        {t("addInput")}
        <span aria-hidden className="text-xs">
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[240px] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-card-lg">
          <div className="border-b border-border/70 px-3 py-2.5">
            <label className="flex items-center justify-between gap-3 text-xs text-muted-foreground">
              <span>{t("addInputCount")}</span>
              <input
                type="number"
                min={1}
                max={maxCount}
                value={count}
                onChange={(e) => {
                  const value = Number(e.target.value);
                  if (Number.isFinite(value)) {
                    setCount(Math.min(Math.max(1, Math.trunc(value)), maxCount));
                  }
                }}
                className="h-8 w-16 rounded-lg border border-border bg-input px-2 text-center text-sm text-foreground"
              />
            </label>
          </div>
          {INPUT_PATTERN_IDS.map((patternId) => (
            <button
              key={patternId}
              type="button"
              onClick={() => selectPattern(patternId)}
              className="block w-full px-3 py-2.5 text-left hover:bg-muted"
            >
              <span className="block text-sm font-medium text-foreground">
                {t(`inputPattern_${patternId}`)}
                {count > 1 ? ` ×${count}` : ""}
              </span>
              <span className="block text-xs text-muted-foreground">
                {t(`inputPattern_${patternId}Desc`)}
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
