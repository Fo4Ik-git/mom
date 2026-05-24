"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import type { InputPatternId } from "@/lib/calculator/input-patterns";
import { INPUT_PATTERN_IDS } from "@/lib/calculator/input-patterns";

interface AddInputPatternMenuProps {
  onSelect: (patternId: InputPatternId) => void;
}

export function AddInputPatternMenu({ onSelect }: AddInputPatternMenuProps) {
  const t = useTranslations("builder");
  const [open, setOpen] = useState(false);
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
        <div className="absolute right-0 z-20 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-card-lg">
          {INPUT_PATTERN_IDS.map((patternId) => (
            <button
              key={patternId}
              type="button"
              onClick={() => {
                onSelect(patternId);
                setOpen(false);
              }}
              className="block w-full px-3 py-2.5 text-left hover:bg-muted"
            >
              <span className="block text-sm font-medium text-foreground">
                {t(`inputPattern_${patternId}`)}
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
