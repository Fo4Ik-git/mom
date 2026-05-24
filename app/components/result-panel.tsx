"use client";

import { useTranslations } from "next-intl";
import { Card, CardTitle } from "@/app/components/ui/card";

interface ResultRow {
  label: string;
  value: number;
  highlight?: boolean;
  warning?: string;
  breakdown?: string;
}

interface ResultPanelProps {
  rows: ResultRow[] | null;
}

function formatAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

export function ResultPanel({ rows }: ResultPanelProps) {
  const t = useTranslations("calculator");

  if (!rows || rows.length === 0) {
    return null;
  }

  return (
    <Card className="overflow-hidden p-0" aria-live="polite">
      <div className="border-b border-border bg-accent-muted/60 px-5 py-3.5">
        <CardTitle className="text-accent">{t("result")}</CardTitle>
      </div>
      <ul className="divide-y divide-border">
        {rows.map((row) => (
          <li
            key={row.label}
            className={`px-5 py-4 ${row.highlight ? "bg-success-muted/40" : ""}`}
          >
            <div className="flex items-center justify-between gap-4">
              <span className="text-sm text-muted-foreground">{row.label}</span>
              <span
                className={`font-mono text-base font-semibold tabular-nums ${
                  row.highlight ? "text-success" : "text-foreground"
                }`}
              >
                {formatAmount(row.value)}
              </span>
            </div>
            {row.breakdown && (
              <p className="mt-1.5 font-mono text-xs text-muted-foreground">
                {row.breakdown}
              </p>
            )}
            {row.warning && (
              <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                {row.warning}
              </p>
            )}
          </li>
        ))}
      </ul>
    </Card>
  );
}
