"use client";

import { useTranslations } from "next-intl";
import { useEffect, useRef, useState } from "react";
import {
  buildOutputFromSnippet,
  type OutputSnippetId,
} from "@/lib/calculator/config/output-snippets";
import type { CalculatorConfig } from "@/types/calculator";

const SNIPPET_IDS: OutputSnippetId[] = ["sumCost", "sumPrice", "margin"];

interface OutputSnippetMenuProps {
  config: CalculatorConfig;
  onAdd: (config: CalculatorConfig) => void;
}

export function OutputSnippetMenu({ config, onAdd }: OutputSnippetMenuProps) {
  const t = useTranslations("builder");
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  const labels = {
    sumCost: t("outputSnippetSumCost"),
    sumPrice: t("outputSnippetSumPrice"),
    margin: t("outputSnippetMargin"),
  };

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

  const available = SNIPPET_IDS.filter(
    (id) => buildOutputFromSnippet(config, id, labels) !== null,
  );

  if (available.length === 0) {
    return null;
  }

  return (
    <div ref={rootRef} className="relative shrink-0">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        className="rounded-xl border border-border px-3 py-2 text-sm font-medium text-muted-foreground hover:border-accent/50 hover:text-foreground"
      >
        {t("outputSnippets")}
        <span aria-hidden className="ml-1 text-xs">
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[220px] overflow-hidden rounded-xl border border-border bg-card py-1 shadow-card-lg">
          {available.map((snippetId) => (
            <button
              key={snippetId}
              type="button"
              onClick={() => {
                const output = buildOutputFromSnippet(config, snippetId, labels);
                if (output) {
                  onAdd({ ...config, outputs: [...config.outputs, output] });
                }
                setOpen(false);
              }}
              className="block w-full px-3 py-2.5 text-left text-sm hover:bg-muted"
            >
              {labels[snippetId === "sumCost" ? "sumCost" : snippetId === "sumPrice" ? "sumPrice" : "margin"]}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
