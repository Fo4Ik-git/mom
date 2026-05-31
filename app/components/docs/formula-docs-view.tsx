"use client";

import { useEffect, useMemo, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Card } from "@/app/components/ui/card";
import { getRawDocMessage, hasRawDocMessage } from "@/lib/i18n/raw-doc-message";
import { DocsMarkdown } from "@/app/components/docs/docs-markdown";
import { FormulaCodeSnippet } from "@/app/components/docs/formula-code-snippet";
import type {
  FormulaDocCategory,
  FormulaDocEntry,
  FormulaDocsData,
} from "@/lib/formula/docs/collect-formula-docs";

type DocsTab = "guide" | "formulas" | "script";

const GUIDE_SECTION_IDS = [
  "overview",
  "configParts",
  "oneFormula",
  "blocksHowTo",
  "codeHowTo",
  "unifiedSync",
  "fullScript",
  "evaluation",
  "tips",
] as const;

const GUIDE_ICONS: Record<(typeof GUIDE_SECTION_IDS)[number], string> = {
  overview: "◆",
  configParts: "▣",
  oneFormula: "⇄",
  blocksHowTo: "▦",
  codeHowTo: "{ }",
  unifiedSync: "⟳",
  fullScript: "📄",
  evaluation: "∑",
  tips: "✦",
};

const CATEGORY_ACCENT: Record<
  FormulaDocCategory | "primitive-default",
  string
> = {
  operators: "from-rose-500/80 to-rose-400/20",
  aggregates: "from-violet-500/80 to-violet-400/20",
  rowAggregates: "from-lime-500/80 to-lime-400/20",
  operands: "from-sky-500/80 to-sky-400/20",
  script: "from-accent to-primary/30",
  "primitive-default": "from-accent/80 to-accent/20",
};

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

function DocsToolbar({
  tabs,
  tab,
  onTabChange,
  query,
  onQueryChange,
  searchPlaceholder,
  showSearch,
}: {
  tabs: { key: DocsTab; label: string }[];
  tab: DocsTab;
  onTabChange: (tab: DocsTab) => void;
  query: string;
  onQueryChange: (value: string) => void;
  searchPlaceholder: string;
  showSearch: boolean;
}) {
  return (
    <div className="sticky top-[3.25rem] z-10 -mx-1 rounded-2xl border border-border/60 bg-background/85 px-2 py-2 shadow-card backdrop-blur-xl sm:top-14 sm:px-3">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div
          className="flex gap-1 overflow-x-auto rounded-xl bg-muted/40 p-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          role="tablist"
        >
          {tabs.map(({ key, label }) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={tab === key}
              onClick={() => onTabChange(key)}
              className={`shrink-0 rounded-lg px-4 py-2.5 text-sm font-medium transition-all ${
                tab === key
                  ? "bg-card text-foreground shadow-card ring-1 ring-border/80"
                  : "text-muted-foreground hover:bg-card/60 hover:text-foreground"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
        {showSearch && (
          <div className="relative w-full lg:max-w-sm">
            <span
              className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            >
              ⌕
            </span>
            <input
              type="search"
              value={query}
              onChange={(event) => onQueryChange(event.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-xl border border-border/80 bg-card py-2.5 pr-3 pl-9 text-sm shadow-sm transition-shadow placeholder:text-muted-foreground/70 focus:border-accent/50 focus:outline-none focus:ring-2 focus:ring-accent/25"
            />
          </div>
        )}
      </div>
    </div>
  );
}

function IntroHero({ children }: { children: string }) {
  return (
    <Card className="relative overflow-hidden border-accent/25 bg-gradient-to-br from-card via-card to-accent-muted/40 p-0 shadow-card-lg">
      <div className="pointer-events-none absolute -right-20 -top-20 size-56 rounded-full bg-accent/15 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-16 -left-16 size-40 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative border-b border-border/40 px-5 py-4 sm:px-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-accent">
          Mom · Help
        </p>
      </div>
      <div className="relative px-5 py-4 sm:px-6 sm:py-5">
        <DocsMarkdown>{children}</DocsMarkdown>
      </div>
    </Card>
  );
}

function UsagePanel({
  label,
  icon,
  children,
  variant,
}: {
  label: string;
  icon: string;
  children: string;
  variant: "code" | "blocks";
}) {
  return (
    <div
      className={`rounded-xl border px-3.5 py-3 ${
        variant === "code"
          ? "border-violet-500/20 bg-violet-500/5 dark:bg-violet-500/10"
          : "border-sky-500/20 bg-sky-500/5 dark:bg-sky-500/10"
      }`}
    >
      <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-foreground/80">
        <span
          className={`flex size-6 items-center justify-center rounded-md font-mono text-[11px] ${
            variant === "code"
              ? "bg-violet-500/15 text-violet-700 dark:text-violet-300"
              : "bg-sky-500/15 text-sky-700 dark:text-sky-300"
          }`}
          aria-hidden
        >
          {icon}
        </span>
        {label}
      </p>
      <DocsMarkdown>{children}</DocsMarkdown>
    </div>
  );
}

function DocCard({
  entry,
  variant,
  locale,
}: {
  entry: FormulaDocEntry;
  variant: "primitive" | "operand" | "script";
  locale: string;
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
  const blockUsagePath = `${prefix}.blockUsage`;
  const codeUsagePath = `${prefix}.codeUsage`;
  const blockUsage = hasRawDocMessage(locale, blockUsagePath)
    ? getRawDocMessage(locale, blockUsagePath)!
    : null;
  const codeUsage = hasRawDocMessage(locale, codeUsagePath)
    ? getRawDocMessage(locale, codeUsagePath)!
    : null;

  const accent =
    variant === "script"
      ? CATEGORY_ACCENT.script
      : variant === "operand"
        ? CATEGORY_ACCENT.operands
        : CATEGORY_ACCENT[entry.category] ?? CATEGORY_ACCENT["primitive-default"];

  return (
    <article
      id={entry.id}
      className="group scroll-mt-28 overflow-hidden rounded-2xl border border-border/80 bg-card/90 shadow-card transition-all hover:border-accent/30 hover:shadow-card-lg"
    >
      <div className={`h-1 bg-gradient-to-r ${accent}`} />
      <div className="p-4 sm:p-5">
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <h3 className="text-base font-semibold tracking-tight text-foreground">
              {title}
            </h3>
            <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
              {description}
            </p>
          </div>
          <code className="shrink-0 rounded-lg bg-muted/80 px-2 py-1 font-mono text-[11px] text-muted-foreground">
            {entry.id}
          </code>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("syntaxLabel")}
            </p>
            <FormulaCodeSnippet code={entry.syntax} />
          </div>
          <div>
            <p className="mb-1.5 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
              {t("exampleLabel")}
            </p>
            <FormulaCodeSnippet code={entry.example} label="example" />
          </div>
        </div>

        {(codeUsage || blockUsage) && (
          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            {codeUsage && (
              <UsagePanel label={t("codeUsageLabel")} icon="{ }" variant="code">
                {codeUsage}
              </UsagePanel>
            )}
            {blockUsage && (
              <UsagePanel label={t("blockUsageLabel")} icon="▦" variant="blocks">
                {blockUsage}
              </UsagePanel>
            )}
          </div>
        )}

        {entry.blockCategory && variant !== "script" && (
          <p className="mt-3 text-xs text-muted-foreground">
            {t("paletteCategoryLabel")}:{" "}
            <span className="rounded-md bg-muted px-1.5 py-0.5 font-medium text-foreground">
              {entry.blockCategory}
            </span>
          </p>
        )}
      </div>
    </article>
  );
}

function SectionHeader({ title, count }: { title: string; count: number }) {
  return (
    <div className="flex flex-wrap items-baseline gap-3">
      <h2 className="text-xl font-semibold tracking-tight text-foreground">{title}</h2>
      <span className="rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
        {count}
      </span>
    </div>
  );
}

function Section({
  title,
  entries,
  variant,
  query,
  locale,
}: {
  title: string;
  entries: FormulaDocEntry[];
  variant: "primitive" | "operand" | "script";
  query: string;
  locale: string;
}) {
  const t = useTranslations("docs");
  const filtered = entries.filter((entry) => matchesQuery(entry, query, t));

  if (filtered.length === 0) {
    return null;
  }

  return (
    <section className="space-y-4">
      <SectionHeader title={title} count={filtered.length} />
      <div className="grid gap-4 xl:grid-cols-2">
        {filtered.map((entry) => (
          <DocCard
            key={`${variant}-${entry.id}`}
            entry={entry}
            variant={variant}
            locale={locale}
          />
        ))}
      </div>
    </section>
  );
}

function GuideSection({
  id,
  index,
  title,
  body,
}: {
  id: string;
  index: number;
  title: string;
  body: string;
}) {
  const icon = GUIDE_ICONS[id as keyof typeof GUIDE_ICONS] ?? "•";

  return (
    <section
      id={`guide-${id}`}
      className="scroll-mt-28 overflow-hidden rounded-2xl border border-border/80 bg-card/80 shadow-card"
    >
      <div className="flex gap-0 sm:gap-0">
        <div className="hidden w-14 shrink-0 flex-col items-center border-r border-border/60 bg-muted/30 py-5 sm:flex">
          <span className="font-mono text-xs font-bold text-accent">{index + 1}</span>
        </div>
        <div className="min-w-0 flex-1 p-5 sm:p-6">
          <div className="mb-4 flex items-start gap-3">
            <span
              className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent-muted text-sm font-semibold text-accent"
              aria-hidden
            >
              {icon}
            </span>
            <h2 className="pt-1.5 text-lg font-semibold tracking-tight text-foreground sm:text-xl">
              {title}
            </h2>
          </div>
          <DocsMarkdown>{body}</DocsMarkdown>
        </div>
      </div>
    </section>
  );
}

function GuideTab({
  locale,
  onNavigate,
}: {
  locale: string;
  onNavigate: (sectionId: string) => void;
}) {
  const t = useTranslations("docs");

  return (
    <div className="lg:grid lg:grid-cols-[minmax(0,13rem)_1fr] lg:gap-8 xl:grid-cols-[minmax(0,15rem)_1fr]">
      <aside className="mb-6 lg:sticky lg:top-36 lg:mb-0 lg:self-start">
        <nav
          className="rounded-2xl border border-border/80 bg-card/60 p-3 shadow-card"
          aria-label={t("tabGuide")}
        >
          <p className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
            {t("guideTocLabel")}
          </p>
          <ul className="space-y-0.5">
            {GUIDE_SECTION_IDS.map((id, index) => (
              <li key={id}>
                <button
                  type="button"
                  onClick={() => onNavigate(id)}
                  className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-left text-sm text-muted-foreground transition-colors hover:bg-accent-muted/60 hover:text-foreground"
                >
                  <span className="w-5 shrink-0 font-mono text-xs text-accent">
                    {index + 1}
                  </span>
                  <span className="line-clamp-2 leading-snug">
                    {t(`guide.sections.${id}.title`)}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        </nav>
      </aside>

      <div className="space-y-6">
        <IntroHero>{t("intro")}</IntroHero>
        {GUIDE_SECTION_IDS.map((id, index) => (
          <GuideSection
            key={id}
            id={id}
            index={index}
            title={t(`guide.sections.${id}.title`)}
            body={
              getRawDocMessage(locale, `guide.sections.${id}.body`) ??
              ""
            }
          />
        ))}
      </div>
    </div>
  );
}

export function FormulaDocsView({ data }: { data: FormulaDocsData }) {
  const locale = useLocale();
  const t = useTranslations("docs");
  const [tab, setTab] = useState<DocsTab>("guide");
  const [query, setQuery] = useState("");

  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (!hash) {
      return;
    }
    if (hash.startsWith("guide-")) {
      setTab("guide");
    } else if (data.script.some((entry) => entry.id === hash)) {
      setTab("script");
    } else {
      setTab("formulas");
    }
    requestAnimationFrame(() => {
      document.getElementById(hash)?.scrollIntoView({ behavior: "smooth", block: "start" });
    });
  }, [data.script]);

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

  const tabs: { key: DocsTab; label: string }[] = [
    { key: "guide", label: t("tabGuide") },
    { key: "formulas", label: t("tabFormulas") },
    { key: "script", label: t("tabScript") },
  ];

  const filteredCount = useMemo(() => {
    if (tab === "guide") {
      return 0;
    }
    const all =
      tab === "script"
        ? byCategory.script
        : [
            ...byCategory.operators,
            ...byCategory.aggregates,
            ...byCategory.rowAggregates,
            ...byCategory.operands,
          ];
    return all.filter((entry) => matchesQuery(entry, query, t)).length;
  }, [tab, query, byCategory, t]);

  function scrollToGuideSection(sectionId: string) {
    const el = document.getElementById(`guide-${sectionId}`);
    el?.scrollIntoView({ behavior: "smooth", block: "start" });
    window.history.replaceState(null, "", `#guide-${sectionId}`);
  }

  return (
    <div className="space-y-6">
      <DocsToolbar
        tabs={tabs}
        tab={tab}
        onTabChange={setTab}
        query={query}
        onQueryChange={setQuery}
        searchPlaceholder={t("searchPlaceholder")}
        showSearch={tab !== "guide"}
      />

      {tab !== "guide" && (
        <div className="max-w-3xl text-sm leading-relaxed text-muted-foreground">
          <DocsMarkdown>{t("introShort")}</DocsMarkdown>
        </div>
      )}

      {tab === "formulas" && query && filteredCount === 0 && (
        <Card className="border-dashed bg-muted/20 py-10 text-center text-sm text-muted-foreground">
          {t("searchEmpty")}
        </Card>
      )}

      {tab === "guide" ? (
        <GuideTab locale={locale} onNavigate={scrollToGuideSection} />
      ) : tab === "formulas" ? (
        <div className="space-y-12">
          <Section
            title={t("categories.operators")}
            entries={byCategory.operators}
            variant="primitive"
            query={query}
            locale={locale}
          />
          <Section
            title={t("categories.aggregates")}
            entries={byCategory.aggregates}
            variant="primitive"
            query={query}
            locale={locale}
          />
          <Section
            title={t("categories.rowAggregates")}
            entries={byCategory.rowAggregates}
            variant="primitive"
            query={query}
            locale={locale}
          />
          <Section
            title={t("categories.operands")}
            entries={byCategory.operands}
            variant="operand"
            query={query}
            locale={locale}
          />
        </div>
      ) : (
        <Section
          title={t("categories.script")}
          entries={byCategory.script}
          variant="script"
          query={query}
          locale={locale}
        />
      )}
    </div>
  );
}
