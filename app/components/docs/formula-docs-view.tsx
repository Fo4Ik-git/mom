"use client";

import { useMemo, useState } from "react";
import Markdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useTranslations } from "next-intl";
import { Card } from "@/app/components/ui/card";
import type {
  FormulaDocCategory,
  FormulaDocEntry,
  FormulaDocsData,
} from "@/lib/formula/docs/collect-formula-docs";

type DocsTab = "formulas" | "script";

function entryTitle(entry: FormulaDocEntry, t: ReturnType<typeof useTranslations<"docs">>) {
  if (entry.category === "script") {
    return t(`script.${entry.id}.title`);
  }
  if (entry.category === "operands") {
    return t(`operands.${entry.id}.title`);
  }
  return t(`primitives.${entry.id}.title`);
}

function entryDescription(
  entry: FormulaDocEntry,
  t: ReturnType<typeof useTranslations<"docs">>,
) {
  if (entry.category === "script") {
    return t(`script.${entry.id}.description`);
  }
  if (entry.category === "operands") {
    return t(`operands.${entry.id}.description`);
  }
  return t(`primitives.${entry.id}.description`);
}

function matchesQuery(
  entry: FormulaDocEntry,
  query: string,
  t: ReturnType<typeof useTranslations<"docs">>,
) {
  if (!query) {
    return true;
  }
  const q = query.toLowerCase();
  return (
    entry.id.includes(q) ||
    entry.syntax.toLowerCase().includes(q) ||
    entry.example.toLowerCase().includes(q) ||
    entryTitle(entry, t).toLowerCase().includes(q) ||
    entryDescription(entry, t).toLowerCase().includes(q)
  );
}

function DocCard({
  entry,
  variant,
}: {
  entry: FormulaDocEntry;
  variant: "primitive" | "operand" | "script";
}) {
  const t = useTranslations("docs");
  const prefix =
    variant === "script"
      ? `script.${entry.id}`
      : variant === "operand"
        ? `operands.${entry.id}`
        : `primitives.${entry.id}`;

  const title = t(`${prefix}.title`);
  const description = t(`${prefix}.description`);
  const blockUsage =
    variant !== "script" && t.has(`${prefix}.blockUsage`)
      ? t(`${prefix}.blockUsage`)
      : null;

  return (
    <Card className="overflow-hidden border-border/80 p-0">
      <div className="border-b border-border/60 bg-muted/30 px-4 py-3">
        <h3 className="font-semibold text-foreground">{title}</h3>
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      </div>
      <div className="space-y-3 px-4 py-3 text-sm">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("syntaxLabel")}
          </p>
          <code className="block overflow-x-auto rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs">
            {entry.syntax}
          </code>
        </div>
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("exampleLabel")}
          </p>
          <pre className="overflow-x-auto rounded-lg bg-muted/50 px-3 py-2 font-mono text-xs whitespace-pre-wrap">
            {entry.example}
          </pre>
        </div>
        {blockUsage && (
          <div>
            <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {t("blockUsageLabel")}
            </p>
            <p className="text-muted-foreground">{blockUsage}</p>
          </div>
        )}
        {entry.blockCategory && variant !== "script" && (
          <p className="text-xs text-muted-foreground">
            {t("paletteCategoryLabel")}:{" "}
            <span className="font-medium text-foreground">{entry.blockCategory}</span>
          </p>
        )}
      </div>
    </Card>
  );
}

function Section({
  title,
  entries,
  variant,
  query,
}: {
  title: string;
  entries: FormulaDocEntry[];
  variant: "primitive" | "operand" | "script";
  query: string;
}) {
  const t = useTranslations("docs");
  const filtered = entries.filter((entry) => matchesQuery(entry, query, t));

  if (filtered.length === 0) {
    return null;
  }

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
      <div className="grid gap-4 sm:grid-cols-2">
        {filtered.map((entry) => (
          <DocCard key={`${variant}-${entry.id}`} entry={entry} variant={variant} />
        ))}
      </div>
    </section>
  );
}

export function FormulaDocsView({ data }: { data: FormulaDocsData }) {
  const t = useTranslations("docs");
  const [tab, setTab] = useState<DocsTab>("formulas");
  const [query, setQuery] = useState("");

  const byCategory = useMemo(() => {
    const map: Record<FormulaDocCategory, FormulaDocEntry[]> = {
      operators: [],
      aggregates: [],
      rowAggregates: [],
      operands: [],
      script: [],
    };
    for (const entry of data.primitives) {
      map[entry.category].push(entry);
    }
    map.operands = data.operands;
    map.script = data.script;
    return map;
  }, [data]);

  return (
    <div className="space-y-8">
      <div className="prose prose-sm dark:prose-invert max-w-none text-muted-foreground">
        <Markdown remarkPlugins={[remarkGfm]}>{t("intro")}</Markdown>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex gap-1 rounded-xl border border-border/80 bg-muted/30 p-1">
          {(["formulas", "script"] as const).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
                tab === key
                  ? "bg-card text-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(key === "formulas" ? "tabFormulas" : "tabScript")}
            </button>
          ))}
        </div>
        <input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder={t("searchPlaceholder")}
          className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm sm:max-w-xs"
        />
      </div>

      {tab === "formulas" ? (
        <div className="space-y-10">
          <Section
            title={t("categories.operators")}
            entries={byCategory.operators}
            variant="primitive"
            query={query}
          />
          <Section
            title={t("categories.aggregates")}
            entries={byCategory.aggregates}
            variant="primitive"
            query={query}
          />
          <Section
            title={t("categories.rowAggregates")}
            entries={byCategory.rowAggregates}
            variant="primitive"
            query={query}
          />
          <Section
            title={t("categories.operands")}
            entries={byCategory.operands}
            variant="operand"
            query={query}
          />
        </div>
      ) : (
        <Section
          title={t("categories.script")}
          entries={byCategory.script}
          variant="script"
          query={query}
        />
      )}
    </div>
  );
}
