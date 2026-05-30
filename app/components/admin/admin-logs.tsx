"use client";

import { useTranslations } from "next-intl";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Card, CardTitle } from "@/app/components/ui/card";
import { Button } from "@/app/components/ui/button";
import { AdminErrorAlert } from "@/app/components/admin/admin-error-alert";
import { appFetch } from "@/lib/api/api-client";
import { adminApiErrorMessage } from "@/lib/admin/admin-api-error";

type LogFileMeta = {
  name: string;
  date: string;
  sizeBytes: number;
  updatedAt: string;
};

type LogEntry = {
  lineNumber: number;
  time?: string;
  level?: string;
  trace_id?: string;
  user_id?: string;
  user_email?: string;
  user_name?: string;
  user_role?: string;
  action?: string;
  event?: string;
  path?: string;
  status?: number;
  duration_ms?: number;
  msg?: string;
  component?: string;
  calculator_id?: string;
  target_user_id?: string;
  share_user_id?: string;
  access_key_id?: string;
  raw: string;
};

type LogsResponse = {
  file: string;
  entries: LogEntry[];
  matchedCount: number;
  truncated: boolean;
  scannedBytes: number;
  fileSizeBytes: number;
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
    <span
      role="button"
      tabIndex={0}
      onClick={(e) => {
        e.stopPropagation();
        onSearch(value);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.stopPropagation();
          onSearch(value);
        }
      }}
      className="font-mono text-[11px] text-muted-foreground hover:text-accent"
      title={value}
    >
      {label}:{" "}
      <span className="text-accent underline decoration-dotted">{value}</span>
    </span>
  );
}

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

export function AdminLogsViewer() {
  const t = useTranslations("admin");
  const [files, setFiles] = useState<LogFileMeta[]>([]);
  const [selectedFile, setSelectedFile] = useState("");
  const [query, setQuery] = useState("");
  const [level, setLevel] = useState<(typeof LEVELS)[number]>("");
  const [actionsOnly, setActionsOnly] = useState(true);
  const [entries, setEntries] = useState<LogEntry[]>([]);
  const [truncated, setTruncated] = useState(false);
  const [fileSizeBytes, setFileSizeBytes] = useState(0);
  const [matchedCount, setMatchedCount] = useState(0);
  const [expandedLine, setExpandedLine] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedTrace, setCopiedTrace] = useState<string | null>(null);

  const loadFiles = useCallback(async () => {
    const res = await appFetch("/api/admin/logs");
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
    async (file: string, opts?: { silent?: boolean }) => {
      if (!file) {
        return;
      }
      if (!opts?.silent) {
        setSearching(true);
      }
      setError(null);

      const params = new URLSearchParams({ file, limit: "200" });
      const q = query.trim();
      if (q) {
        params.set("q", q);
      }
      if (level) {
        params.set("level", level);
      }
      if (actionsOnly) {
        params.set("event", "audit.action");
      }

      try {
        const res = await appFetch(`/api/admin/logs?${params}`);
        const data = (await res.json()) as LogsResponse & { error?: string };
        if (!res.ok) {
          setError(adminApiErrorMessage(data, t));
          return;
        }
        setEntries(data.entries ?? []);
        setTruncated(Boolean(data.truncated));
        setFileSizeBytes(data.fileSizeBytes ?? 0);
        setMatchedCount(data.matchedCount ?? 0);
      } catch {
        setError(t("logsLoadFailed"));
      } finally {
        setSearching(false);
        setLoading(false);
      }
    },
    [query, level, actionsOnly, t],
  );

  useEffect(() => {
    loadFiles().catch(() => setError(t("logsLoadFailed")));
  }, [loadFiles, t]);

  useEffect(() => {
    if (!selectedFile) {
      return;
    }
    const timer = window.setTimeout(() => {
      void fetchEntries(selectedFile);
    }, 300);
    return () => window.clearTimeout(timer);
  }, [selectedFile, fetchEntries]);

  const activeFileMeta = useMemo(
    () => files.find((f) => f.name === selectedFile),
    [files, selectedFile],
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
              onChange={(e) => setSelectedFile(e.target.value)}
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
              onChange={(e) => setQuery(e.target.value)}
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
              onClick={() => setLevel(value)}
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
              onChange={(e) => setActionsOnly(e.target.checked)}
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

      <Card className="overflow-hidden p-0">
        {loading ? (
          <p className="p-4 text-sm text-muted-foreground">{t("logsLoading")}</p>
        ) : entries.length === 0 ? (
          <p className="p-4 text-sm text-muted-foreground">{t("logsEmpty")}</p>
        ) : (
          <ul className="divide-y divide-border">
            {entries.map((entry) => {
              const expanded = expandedLine === entry.lineNumber;
              return (
                <li key={`${entry.lineNumber}-${entry.time}`} className="text-sm">
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedLine(expanded ? null : entry.lineNumber)
                    }
                    className="flex w-full flex-col gap-1 px-4 py-3 text-left hover:bg-muted/50"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase ${levelClass(entry.level)}`}
                      >
                        {entry.level ?? "?"}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {formatTime(entry.time)}
                      </span>
                      {entry.action && (
                        <span className="font-mono text-xs font-medium text-accent">
                          {entry.action}
                        </span>
                      )}
                      {!entry.action && entry.event && (
                        <span className="font-mono text-xs text-muted-foreground">
                          {entry.event}
                        </span>
                      )}
                      {(entry.user_email || entry.user_name) && (
                        <span className="text-xs text-foreground/80">
                          {entry.user_name ?? entry.user_email}
                          {entry.user_role ? ` (${entry.user_role})` : ""}
                        </span>
                      )}
                      {entry.status != null && (
                        <span className="text-xs">HTTP {entry.status}</span>
                      )}
                      {entry.duration_ms != null && (
                        <span className="text-xs text-muted-foreground">
                          {entry.duration_ms} ms
                        </span>
                      )}
                    </div>
                    <p className="line-clamp-2 font-mono text-xs text-foreground/90">
                      {entry.msg ?? entry.path ?? entry.raw}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {entry.user_id && (
                        <SearchChip
                          label="user_id"
                          value={entry.user_id}
                          onSearch={filterBySearch}
                        />
                      )}
                      {entry.user_email && (
                        <SearchChip
                          label="email"
                          value={entry.user_email}
                          onSearch={filterBySearch}
                        />
                      )}
                      {entry.target_user_id && (
                        <SearchChip
                          label="target_user_id"
                          value={entry.target_user_id}
                          onSearch={filterBySearch}
                        />
                      )}
                      {entry.calculator_id && (
                        <SearchChip
                          label="calculator_id"
                          value={entry.calculator_id}
                          onSearch={filterBySearch}
                        />
                      )}
                      {entry.trace_id && (
                        <>
                          <SearchChip
                            label="trace_id"
                            value={entry.trace_id}
                            onSearch={filterBySearch}
                          />
                          <span
                            role="button"
                            tabIndex={0}
                            onClick={(e) => {
                              e.stopPropagation();
                              void copyTrace(entry.trace_id!);
                            }}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.stopPropagation();
                                void copyTrace(entry.trace_id!);
                              }
                            }}
                            className="text-[11px] text-accent underline"
                          >
                            {copiedTrace === entry.trace_id
                              ? t("logsCopied")
                              : t("logsCopyTrace")}
                          </span>
                        </>
                      )}
                    </div>
                  </button>
                  {expanded && (
                    <pre className="max-h-64 overflow-auto border-t border-border bg-muted/30 px-4 py-3 font-mono text-[11px] leading-relaxed whitespace-pre-wrap break-all">
                      {(() => {
                        try {
                          return JSON.stringify(JSON.parse(entry.raw), null, 2);
                        } catch {
                          return entry.raw;
                        }
                      })()}
                    </pre>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </Card>
    </div>
  );
}
