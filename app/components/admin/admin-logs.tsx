"use client";

import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { AdminErrorAlert } from "@/app/components/admin/admin-error-alert";
import { LogEntryDetail } from "@/app/components/admin/log-entry-detail";
import { LogDetailShell } from "@/app/components/admin/log-detail-shell";
import { appFetch } from "@/lib/api/api-client";
import { adminApiErrorMessage } from "@/lib/admin/admin-api-error";
import type { LogEntry } from "@/lib/logger/log-entry";
import { LOG_PAGE_SIZES, type LogPageSize } from "@/lib/logger/log-pagination";
import { tableRange, type TablePagination } from "@/lib/ui/table-pagination";
import { formatLogEntryTitle } from "@/lib/i18n/log-action-labels";

type LogFileMeta = {
  name: string;
  date: string;
  sizeBytes: number;
  updatedAt: string;
};

type LogsResponse = {
  file: string;
  entries: LogEntry[];
  matchedCount: number;
  truncated: boolean;
  scannedBytes: number;
  fileSizeBytes: number;
  pagination: TablePagination;
};

const LEVELS = ["", "error", "warn", "info", "debug"] as const;

function formatBytes(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function levelClass(level?: string): string {
  switch (level) {
    case "fatal":
    case "error":
      return "bg-destructive/15 text-destructive";
    case "warn":
      return "bg-amber-500/15 text-amber-700 dark:text-amber-400";
    case "debug":
    case "trace":
      return "bg-muted text-muted-foreground";
    default:
      return "bg-accent/10 text-accent";
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
      return "border-l-muted-foreground/30";
    default:
      return "border-l-accent/70";
  }
}

function statusBadgeClass(status: number): string {
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

function SearchChip({
  label,
  value,
  onSearch,
}: {
  label: string;
  value: string;
  onSearch: (value: string) => void;
}) {
  return (
    <button
      type="button"
      onClick={(e) => {
        e.stopPropagation();
        onSearch(value);
      }}
      className="max-w-[200px] truncate rounded-md bg-muted/60 px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground transition hover:bg-accent/10 hover:text-accent"
      title={`${label}: ${value}`}
    >
      <span className="text-muted-foreground/80">{label}</span>{" "}
      <span className="text-foreground/90">{value}</span>
    </button>
  );
}

function formatTime(iso?: string): string {
  if (!iso) {
    return "—";
  }
  try {
    return new Date(iso).toLocaleString(undefined, {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
    });
  } catch {
    return iso;
  }
}

function LogEntryRow({
  entry,
  selected,
  onSelect,
  onFilter,
  locale,
}: {
  entry: LogEntry;
  selected: boolean;
  onSelect: () => void;
  onFilter: (value: string) => void;
  locale: string;
}) {
  const { primary, secondary } = formatLogEntryTitle(entry, locale);

  return (
    <li>
      <button
        type="button"
        onClick={onSelect}
        className={`flex w-full gap-3 border-l-4 px-4 py-3 text-left transition ${levelBorderClass(entry.level)} ${
          selected
            ? "bg-accent/8 ring-1 ring-inset ring-accent/25"
            : "hover:bg-muted/40"
        }`}
      >
        <div className="flex min-w-0 flex-1 flex-col gap-2">
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
            <span className="font-mono text-[10px] text-muted-foreground">
              #{entry.lineNumber}
            </span>
            <span
              className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide ${levelClass(entry.level)}`}
            >
              {entry.level ?? "?"}
            </span>
            <span className="text-xs tabular-nums text-muted-foreground">
              {formatTime(entry.time)}
            </span>
            {entry.status != null && (
              <span
                className={`rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold ${statusBadgeClass(entry.status)}`}
              >
                {entry.status}
              </span>
            )}
            {entry.duration_ms != null && (
              <span className="font-mono text-[10px] text-muted-foreground">
                {entry.duration_ms}ms
              </span>
            )}
          </div>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {primary}
            </p>
            {secondary && (
              <p className="mt-0.5 truncate font-mono text-xs text-muted-foreground">
                {secondary}
              </p>
            )}
            {!secondary && entry.msg && entry.msg !== primary && (
              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                {entry.msg}
              </p>
            )}
            {(entry.user_name || entry.user_email) && (
              <p className="mt-1 text-xs text-foreground/75">
                {entry.user_name ?? entry.user_email}
                {entry.user_role ? ` · ${entry.user_role}` : ""}
              </p>
            )}
          </div>

          <div className="flex flex-wrap gap-1.5">
            {entry.trace_id && (
              <SearchChip label="trace" value={entry.trace_id} onSearch={onFilter} />
            )}
            {entry.user_id && (
              <SearchChip label="user" value={entry.user_id} onSearch={onFilter} />
            )}
            {entry.calculator_id && (
              <SearchChip
                label="calc"
                value={entry.calculator_id}
                onSearch={onFilter}
              />
            )}
          </div>
        </div>

        <span
          className={`mt-1 shrink-0 text-xs text-muted-foreground ${selected ? "text-accent" : ""}`}
          aria-hidden
        >
          {selected ? "◀" : "▶"}
        </span>
      </button>
    </li>
  );
}

export function AdminLogsViewer() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const [files, setFiles] = useState<LogFileMeta[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("");
  const [actionsOnly, setActionsOnly] = useState(true);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [fileSizeBytes, setFileSizeBytes] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [pagination, setPagination] = useState<TablePagination>({
    page: 1,
    pageSize: 50,
    total: 0,
    totalPages: 1,
  });
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<LogPageSize>(50);
  const [selectedLine, setSelectedLine] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedTrace, setCopiedTrace] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    const res = await appFetch("/api/admin/audit");
    const data = await res.json();
    if (!res.ok) {
      throw new Error(adminApiErrorMessage(data, t));
    }
    const list = (data.files ?? []) as LogFileMeta[];
    setFiles(list);
    setSelectedFile((current) => current || list[0]?.name || "");
    return list;
  }, [t]);

  const fetchEntries = useCallback(
    async (
      file: string,
      opts?: { silent?: boolean; page?: number; pageSize?: LogPageSize },
    ) => {
      if (!file) {
        return;
      }
      if (!opts?.silent) {
        setSearching(true);
      }
      setError(null);

      const requestPage = opts?.page ?? page;
      const requestPageSize = opts?.pageSize ?? pageSize;
      const params = new URLSearchParams({
        file,
        page: String(requestPage),
        pageSize: String(requestPageSize),
      });
      const q = query.trim();
      if (q) {
        params.set("q", q);
      }
      if (level) {
        params.set("level", level);
      }
      if (actionsOnly) {
        params.set("actionsOnly", "1");
      }

      try {
        const res = await appFetch(`/api/admin/audit?${params}`);
        const data = (await res.json()) as LogsResponse & { error?: string };
        if (!res.ok) {
          setError(adminApiErrorMessage(data, t));
          return;
        }
        setEntries(data.entries ?? []);
        setTruncated(Boolean(data.truncated));
        setFileSizeBytes(data.fileSizeBytes ?? 0);
        setMatchedCount(data.matchedCount ?? 0);
        if (data.pagination) {
          setPagination(data.pagination);
          setPage(data.pagination.page);
          setPageSize(data.pagination.pageSize as LogPageSize);
        }
        setSelectedLine((current) => {
          const lines = (data.entries ?? []).map((e) => e.lineNumber);
          if (current != null && lines.includes(current)) {
            return current;
          }
          return null;
        });
      } catch {
        setError(t("logsLoadFailed"));
      } finally {
        setSearching(false);
        setLoading(false);
      }
    },
    [query, level, actionsOnly, page, pageSize, t],
  );

  useEffect(() => {
    loadFiles().catch(() => setError(t("logsLoadFailed")));
  }, [loadFiles, t]);

  useEffect(() => {
    if (!selectedFile) {
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchEntries(selectedFile, { page });
    }, 300);
    return () => window.clearTimeout(timer);
  }, [selectedFile, fetchEntries, page]);

  useEffect(() => {
    if (selectedLine == null) {
      return;
    }
    if (window.matchMedia("(min-width: 1280px)").matches) {
      return;
    }
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [selectedLine]);

  function handlePageSizeChange(next: LogPageSize) {
    setPageSize(next);
    setPage(1);
    if (selectedFile) {
      void fetchEntries(selectedFile, { page: 1, pageSize: next });
    }
  }

  function handlePageChange(next: number) {
    setPage(next);
    if (selectedFile) {
      void fetchEntries(selectedFile, { page: next });
    }
  }

  const listRange = tableRange(pagination);

  const activeFileMeta = useMemo(
    () => files.find((f) => f.name === selectedFile),
    [files, selectedFile],
  );

  const selectedEntry = useMemo(
    () => entries.find((e) => e.lineNumber === selectedLine) ?? null,
    [entries, selectedLine],
  );

  async function copyTrace(id: string) {
    try {
      await navigator.clipboard.writeText(id);
      setCopiedTrace(id);
      window.setTimeout(() => setCopiedTrace(null), 2000);
    } catch {
      /* ignore */
    }
  }

  function filterBySearch(value?: string) {
    if (!value) {
      return;
    }
    setPage(1);
    setQuery(value);
  }

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">{t("logsTitle")}</h2>
        <p className="mt-1 text-sm text-muted-foreground">{t("logsHint")}</p>
      </div>

      {error && <AdminErrorAlert message={error} />}

      <Card className="gap-4 p-4">
        <CardTitle className="text-base">{t("logsFilters")}</CardTitle>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-sm">
            <span className="text-muted-foreground">{t("logsFile")}</span>
            <select
              value={selectedFile}
              onChange={(e) => {
                setPage(1);
                setSelectedFile(e.target.value);
              }}
              className="rounded-lg border border-border bg-background px-3 py-2"
              disabled={files.length === 0}
            >
              {files.length === 0 ? (
                <option value="">{t("logsNoFiles")}</option>
              ) : (
                files.map((file) => (
                  <option key={file.name} value={file.name}>
                    {file.date} ({formatBytes(file.sizeBytes)})
                  </option>
                ))
              )}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-sm sm:col-span-1 lg:col-span-1">
            <span className="text-muted-foreground">{t("logsSearch")}</span>
            <input
              type="search"
              value={query}
              onChange={(e) => {
                setPage(1);
                setQuery(e.target.value);
              }}
              placeholder={t("logsSearchPlaceholder")}
              className="rounded-lg border border-border bg-background px-3 py-2 font-mono text-xs"
            />
            <span className="text-[11px] text-muted-foreground">
              {t("logsSearchHint")}
            </span>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-muted-foreground">{t("logsLevel")}</span>
          {LEVELS.map((value) => (
            <button
              key={value || "all"}
              type="button"
              onClick={() => {
                setPage(1);
                setLevel(value);
              }}
              className={`rounded-full px-3 py-1 text-xs font-medium transition ${
                level === value
                  ? "bg-accent text-accent-foreground"
                  : "bg-muted text-muted-foreground hover:bg-muted/80"
              }`}
            >
              {value ? value.toUpperCase() : t("logsLevelAll")}
            </button>
          ))}
          <label className="flex items-center gap-2 text-xs text-muted-foreground">
            <input
              type="checkbox"
              checked={actionsOnly}
              onChange={(e) => {
                setPage(1);
                setActionsOnly(e.target.checked);
              }}
              className="size-4 rounded border-border"
            />
            {t("logsActionsOnly")}
          </label>
          <Button
            type="button"
            variant="outline"
            className="ml-auto h-9 px-3 text-xs"
            disabled={!selectedFile || searching}
            onClick={() => void fetchEntries(selectedFile, { silent: true })}
          >
            {searching ? t("logsRefreshing") : t("logsRefresh")}
          </Button>
        </div>

        {activeFileMeta && (
          <p className="text-xs text-muted-foreground">
            {t("logsFileMeta", {
              size: formatBytes(fileSizeBytes || activeFileMeta.sizeBytes),
              matched: matchedCount,
            })}
            {truncated ? ` · ${t("logsTruncated")}` : ""}
          </p>
        )}
      </Card>

      <div className="grid items-start gap-4 xl:grid-cols-[minmax(0,1fr)_auto]">
        <Card className="overflow-hidden p-0">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">{t("logsLoading")}</p>
          ) : entries.length === 0 ? (
            <p className="p-4 text-sm text-muted-foreground">{t("logsEmpty")}</p>
          ) : (
            <>
              <ul className="divide-y divide-border/60">
                {entries.map((entry) => (
                  <LogEntryRow
                    key={`${entry.lineNumber}-${entry.time}`}
                    entry={entry}
                    selected={selectedLine === entry.lineNumber}
                    onSelect={() =>
                      setSelectedLine((current) =>
                        current === entry.lineNumber ? null : entry.lineNumber,
                      )
                    }
                    onFilter={filterBySearch}
                    locale={locale}
                  />
                ))}
              </ul>
              <div className="flex flex-col gap-3 border-t border-border p-4">
                <p className="text-sm text-muted-foreground">
                  {pagination.total > 0
                    ? t("usersShowing", {
                        from: listRange.from,
                        to: listRange.to,
                        total: pagination.total,
                      })
                    : t("logsEmpty")}
                  {" · "}
                  {t("usersPage", {
                    page: pagination.page,
                    pages: pagination.totalPages,
                  })}
                </p>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <label className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
                    <span className="text-muted-foreground">{t("usersPageSize")}</span>
                    <select
                      value={pageSize}
                      onChange={(e) =>
                        handlePageSizeChange(Number(e.target.value) as LogPageSize)
                      }
                      className="h-11 w-full rounded-xl border border-border bg-input px-3 text-base sm:h-10 sm:w-32 sm:text-sm"
                      disabled={searching}
                    >
                      {LOG_PAGE_SIZES.map((size) => (
                        <option key={size} value={size}>
                          {size}
                        </option>
                      ))}
                    </select>
                  </label>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 flex-1 sm:flex-none"
                      disabled={searching || pagination.page <= 1}
                      onClick={() => handlePageChange(Math.max(1, pagination.page - 1))}
                    >
                      {t("usersPrev")}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="h-10 flex-1 sm:flex-none"
                      disabled={
                        searching || pagination.page >= pagination.totalPages
                      }
                      onClick={() =>
                        handlePageChange(
                          Math.min(pagination.totalPages, pagination.page + 1),
                        )
                      }
                    >
                      {t("usersNext")}
                    </Button>
                  </div>
                </div>
              </div>
            </>
          )}
        </Card>

        {selectedEntry ? (
          <>
            <div className="hidden xl:block xl:sticky xl:top-4">
              <LogDetailShell variant="side">
                <LogEntryDetail
                  entry={selectedEntry}
                  onClose={() => setSelectedLine(null)}
                  onFilter={filterBySearch}
                  onCopyTrace={(id) => void copyTrace(id)}
                  copiedTrace={copiedTrace}
                />
              </LogDetailShell>
            </div>
            <div
              className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 xl:hidden"
              role="presentation"
              onClick={() => setSelectedLine(null)}
            >
              <div
                className="mx-auto w-full max-w-[1100px] overflow-hidden"
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
              >
                <LogDetailShell variant="modal">
                  <LogEntryDetail
                    entry={selectedEntry}
                    onClose={() => setSelectedLine(null)}
                    onFilter={filterBySearch}
                    onCopyTrace={(id) => void copyTrace(id)}
                    copiedTrace={copiedTrace}
                  />
                </LogDetailShell>
              </div>
            </div>
          </>
        ) : (
          entries.length > 0 && (
            <Card className="hidden border-dashed p-6 text-center text-sm text-muted-foreground xl:flex xl:flex-col xl:items-center xl:justify-center">
              <p>{t("logsSelectEntry")}</p>
            </Card>
          )
        )}
      </div>
    </div>
  );
}
