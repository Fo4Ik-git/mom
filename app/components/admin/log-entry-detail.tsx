"use client";

import { useLocale, useTranslations } from "next-intl";
import { formatLogEntryTitle } from "@/lib/i18n/log-action-labels";
import { Button } from "@/app/components/ui/button";
import { LogJsonView } from "@/app/components/admin/log-json-view";
import type { LogEntry } from "@/lib/logger/log-entry";
import { parseLogPayload } from "@/lib/logger/log-entry";

function formatTime(iso?: string): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

function levelBorderClass(level?: string): string {
  switch (level) {
    case "fatal":
    case "error":
      return "border-l-destructive";
    case "warn":
      return "border-l-amber-500";
    case "debug":
    case "trace":
      return "border-l-muted-foreground/40";
    default:
      return "border-l-accent";
  }
}

function statusClass(status: number): string {
  if (status >= 500) {
    return "bg-destructive/15 text-destructive";
  }
  if (status >= 400) {
    return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
  }
  if (status >= 200) {
    return "bg-success-muted text-success";
  }
  return "bg-muted text-muted-foreground";
}

function MetaRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-0.5">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd className="min-w-0 break-all font-mono text-xs text-foreground">{value}</dd>
    </div>
  );
}

function EntryMeta({
  entry,
  onFilter,
  onCopyTrace,
  copiedTrace,
}: {
  entry: LogEntry;
  onFilter: (value: string) => void;
  onCopyTrace: (traceId: string) => void;
  copiedTrace: string | null;
}) {
  const t = useTranslations("admin");

  return (
    <dl className="grid gap-3">
      {entry.level && <MetaRow label={t("logsLevel")} value={entry.level} />}
      {entry.msg && <MetaRow label="msg" value={entry.msg} />}
      {entry.path && <MetaRow label="path" value={entry.path} />}
      {entry.status != null && (
        <div className="flex flex-col gap-1">
          <span className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            status
          </span>
          <div className="flex flex-wrap items-center gap-2">
            <span
              className={`rounded px-2 py-0.5 font-mono text-xs font-semibold ${statusClass(entry.status)}`}
            >
              {entry.status}
            </span>
            {entry.duration_ms != null && (
              <span className="font-mono text-xs text-muted-foreground">
                {entry.duration_ms} ms
              </span>
            )}
          </div>
        </div>
      )}
      {(entry.user_name || entry.user_email) && (
        <MetaRow
          label="user"
          value={`${entry.user_name ?? entry.user_email ?? ""}${entry.user_role ? ` (${entry.user_role})` : ""}`}
        />
      )}
      {entry.trace_id && (
        <div className="space-y-2">
          <MetaRow label="trace_id" value={entry.trace_id} />
          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() => onFilter(entry.trace_id!)}
            >
              {t("logsFilterTrace")}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-7 px-2 text-[11px]"
              onClick={() => onCopyTrace(entry.trace_id!)}
            >
              {copiedTrace === entry.trace_id ? t("logsCopied") : t("logsCopyTrace")}
            </Button>
          </div>
        </div>
      )}
    </dl>
  );
}

export function LogEntryDetail({
  entry,
  onClose,
  onFilter,
  onCopyTrace,
  copiedTrace,
  layout = "split",
}: {
  entry: LogEntry;
  onClose: () => void;
  onFilter: (value: string) => void;
  onCopyTrace: (traceId: string) => void;
  copiedTrace: string | null;
  /** `split`: meta left, JSON right (from ~480px width). `stack`: always vertical. */
  layout?: "split" | "stack";
}) {
  const t = useTranslations("admin");
  const locale = useLocale();
  const payload = parseLogPayload(entry);
  const { primary, secondary } = formatLogEntryTitle(entry, locale);

  const bodyClass =
    layout === "stack"
      ? "flex min-h-0 flex-1 flex-col overflow-hidden"
      : "flex min-h-0 flex-1 flex-col overflow-hidden min-[480px]:flex-row";

  const metaClass =
    layout === "stack"
      ? "shrink-0 overflow-y-auto border-b border-border px-4 py-3"
      : "shrink-0 overflow-y-auto border-b border-border px-4 py-3 min-[480px]:w-56 min-[480px]:border-b-0 min-[480px]:border-r lg:w-60";

  const jsonClass =
    layout === "stack"
      ? "flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden px-4 py-3"
      : "flex min-h-0 min-w-0 flex-1 flex-col gap-2 overflow-hidden px-4 py-3";

  return (
    <div
      className={`flex h-full flex-col overflow-hidden rounded-xl border border-border bg-card shadow-card ${levelBorderClass(entry.level)} border-l-4`}
    >
      <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
        <div className="min-w-0 space-y-1">
          <p className="text-xs font-medium text-muted-foreground">
            {t("logsLine", { line: entry.lineNumber })}
          </p>
          <h3 className="text-sm font-semibold text-foreground">{primary}</h3>
          {secondary && (
            <p className="font-mono text-xs text-muted-foreground">{secondary}</p>
          )}
          <p className="text-xs text-muted-foreground">{formatTime(entry.time)}</p>
        </div>
        <Button
          type="button"
          variant="outline"
          className="h-8 shrink-0 px-2 text-xs"
          onClick={onClose}
        >
          {t("logsCloseDetail")}
        </Button>
      </div>

      <div className={bodyClass}>
        <aside className={metaClass}>
          <EntryMeta
            entry={entry}
            onFilter={onFilter}
            onCopyTrace={onCopyTrace}
            copiedTrace={copiedTrace}
          />
        </aside>

        <section className={jsonClass}>
          <p className="shrink-0 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            {t("logsJsonTitle")}
          </p>
          {payload ? (
            <LogJsonView
              value={payload}
              copyLabel={t("logsCopyJson")}
              className="min-h-0 flex-1"
            />
          ) : (
            <pre className="min-h-0 flex-1 overflow-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
              {entry.raw}
            </pre>
          )}
        </section>
      </div>
    </div>
  );
}
