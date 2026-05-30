"use client";

import type { ReactNode } from "react";
import { useLocale, useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useMemo, useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Label,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { AdminAnalytics, AdminIssueRow, AnalyticsRange } from "@/lib/admin-analytics";
import { formatAccessDate } from "@/lib/access-display";
import { Link } from "@/i18n/navigation";
import { appFetch } from "@/lib/api-client";
import { adminApiErrorMessage } from "@/lib/admin-api-error";
import { AdminErrorAlert } from "@/app/components/admin/admin-error-alert";

const RANGES: AnalyticsRange[] = ["24h", "7d", "30d", "90d"];

const COLORS = {
  accent: "#8774E1",
  blue: "#5B9BD5",
  green: "#34D399",
  amber: "#FBBF24",
  rose: "#FB7185",
  slate: "#94A3B8",
};

const PIE_COLORS = [COLORS.accent, COLORS.rose, COLORS.amber, COLORS.blue, COLORS.green];

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { name?: string; value?: number; color?: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) {
    return null;
  }
  return (
    <div className="rounded-lg border border-border bg-card px-3 py-2 text-xs shadow-lg">
      {label && <p className="mb-1 font-medium text-foreground">{label}</p>}
      {payload.map((entry) => (
        <p key={entry.name} className="flex items-center gap-2 text-muted-foreground">
          <span
            className="size-2 rounded-full"
            style={{ background: entry.color }}
          />
          <span>{entry.name}</span>
          <span className="ml-auto font-semibold tabular-nums text-foreground">
            {entry.value}
          </span>
        </p>
      ))}
    </div>
  );
}

function Panel({
  title,
  height = 240,
  children,
  className = "",
}: {
  title: string;
  height?: number;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`rounded-2xl border border-border/80 bg-card p-4 shadow-sm ${className}`}
    >
      <h3 className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
        {title}
      </h3>
      <div style={{ height, width: "100%" }}>{children}</div>
    </section>
  );
}

function StatPill({
  value,
  label,
  delta,
  color,
  onClick,
}: {
  value: number;
  label: string;
  delta?: number;
  color?: string;
  onClick?: () => void;
}) {
  const interactive = Boolean(onClick);
  const className = `flex min-w-[100px] flex-1 flex-col rounded-xl border border-border/60 bg-card/80 px-4 py-3 text-left ${
    interactive
      ? "cursor-pointer transition hover:border-accent/50 hover:bg-card focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent"
      : ""
  }`;

  const content = (
    <>
      <span
        className="text-2xl font-bold tabular-nums leading-none"
        style={color ? { color } : undefined}
      >
        {value}
      </span>
      <span className="mt-1.5 text-[11px] leading-tight text-muted-foreground">
        {label}
      </span>
      {delta !== undefined && delta > 0 && (
        <span className="mt-0.5 text-[10px] font-medium text-green-600 dark:text-green-400">
          +{delta}
        </span>
      )}
    </>
  );

  if (interactive) {
    return (
      <button type="button" onClick={onClick} className={className}>
        {content}
      </button>
    );
  }

  return <div className={className}>{content}</div>;
}

function IssuesDetailsModal({
  open,
  issues,
  locale,
  dismissingId,
  onClose,
  onDismiss,
  onDismissAll,
}: {
  open: boolean;
  issues: AdminIssueRow[];
  locale: string;
  dismissingId: string | null;
  onClose: () => void;
  onDismiss: (issue: AdminIssueRow) => void;
  onDismissAll: () => void;
}) {
  const t = useTranslations("admin");
  const isDismissing = dismissingId !== null;

  useEffect(() => {
    if (!open) {
      return;
    }
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onClose();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.body.style.overflow = previous;
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, onClose]);

  if (!open) {
    return null;
  }

  const banned = issues.filter((issue) => issue.kind === "banned");
  const expired = issues.filter((issue) => issue.kind === "expired");

  const renderIssue = (issue: AdminIssueRow) => {
    const reasonLabel =
      issue.kind === "banned" && issue.banReason
        ? t(`banReason_${issue.banReason}` as "banReason_ACCESS_EXPIRED")
        : null;
    const rowDismissing = dismissingId === issue.id;

    return (
      <li
        key={issue.id}
        className="rounded-xl border border-border/70 bg-muted/20 px-3 py-2.5"
      >
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-foreground">
              {issue.name?.trim() || issue.email}
            </p>
            {issue.name?.trim() && (
              <p className="truncate text-xs text-muted-foreground">{issue.email}</p>
            )}
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                issue.kind === "banned"
                  ? "bg-rose-500/15 text-rose-600 dark:text-rose-400"
                  : "bg-amber-500/15 text-amber-700 dark:text-amber-400"
              }`}
            >
              {issue.kind === "banned" ? t("distBanned") : t("distExpired")}
            </span>
            <button
              type="button"
              disabled={isDismissing}
              onClick={() => onDismiss(issue)}
              className="rounded-lg border border-border px-2 py-1 text-[11px] font-medium text-muted-foreground transition hover:bg-muted hover:text-foreground disabled:opacity-50"
            >
              {rowDismissing ? t("issuesDismissing") : t("issuesDismiss")}
            </button>
          </div>
        </div>
        <dl className="mt-2 space-y-1 text-xs text-muted-foreground">
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium text-foreground/80">{t("role")}:</dt>
            <dd>{issue.role}</dd>
          </div>
          {reasonLabel && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium text-foreground/80">{t("banSelectReason")}:</dt>
              <dd>{reasonLabel}</dd>
            </div>
          )}
          {issue.accessExpiresAt && (
            <div className="flex flex-wrap gap-x-2">
              <dt className="font-medium text-foreground/80">{t("accessUntil")}:</dt>
              <dd>{formatAccessDate(issue.accessExpiresAt, locale)}</dd>
            </div>
          )}
          <div className="flex flex-wrap gap-x-2">
            <dt className="font-medium text-foreground/80">{t("calculatorsQuota")}:</dt>
            <dd>{issue.calculatorsCount}</dd>
          </div>
          {issue.adminNotes?.trim() && (
            <div>
              <dt className="font-medium text-foreground/80">{t("adminNotes")}</dt>
              <dd className="mt-0.5 whitespace-pre-wrap text-foreground/90">
                {issue.adminNotes}
              </dd>
            </div>
          )}
        </dl>
      </li>
    );
  };

  return (
    <>
      <button
        type="button"
        aria-label={t("issuesModalClose")}
        className="fixed inset-0 z-40 bg-black/50 touch-manipulation"
        onClick={onClose}
      />
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none">
        <div
          role="dialog"
          aria-modal
          aria-labelledby="admin-issues-modal-title"
          className="pointer-events-auto flex max-h-[min(80vh,640px)] w-full max-w-lg flex-col rounded-2xl border border-border bg-card shadow-card-lg"
        >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-border px-4 py-3">
          <div>
            <h3 id="admin-issues-modal-title" className="text-base font-semibold text-foreground">
              {t("issuesModalTitle")}
            </h3>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {issues.length === 0
                ? t("issuesModalEmpty")
                : t("issuesModalSummary", { count: issues.length })}
            </p>
            {issues.length > 0 && (
              <p className="mt-1 text-[11px] text-muted-foreground/80">
                {t("issuesDismissHint")}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg px-2 py-1 text-sm text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label={t("issuesModalClose")}
          >
            ×
          </button>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-3">
          {issues.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              {t("issuesModalAllClear")}
            </p>
          ) : (
            <div className="space-y-4">
              {banned.length > 0 && (
                <section>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t("issuesSectionBanned", { count: banned.length })}
                  </h4>
                  <ul className="space-y-2">{banned.map(renderIssue)}</ul>
                </section>
              )}
              {expired.length > 0 && (
                <section>
                  <h4 className="mb-2 text-[11px] font-semibold uppercase tracking-widest text-muted-foreground">
                    {t("issuesSectionExpired", { count: expired.length })}
                  </h4>
                  <ul className="space-y-2">{expired.map(renderIssue)}</ul>
                </section>
              )}
            </div>
          )}
        </div>
        <div className="shrink-0 space-y-2 border-t border-border px-4 py-3">
          {issues.length > 0 && (
            <button
              type="button"
              disabled={isDismissing}
              onClick={onDismissAll}
              className="inline-flex w-full items-center justify-center rounded-xl border border-border px-4 py-2 text-sm font-semibold text-foreground hover:bg-muted disabled:opacity-50"
            >
              {isDismissing ? t("issuesDismissing") : t("issuesDismissAll")}
            </button>
          )}
          <Link
            href="/admin/users"
            onClick={onClose}
            className="inline-flex w-full items-center justify-center rounded-xl bg-accent px-4 py-2 text-sm font-semibold text-accent-foreground hover:opacity-90"
          >
            {t("issuesModalManageUsers")}
          </Link>
        </div>
        </div>
      </div>
    </>
  );
}

function DonutChart({
  data,
  center,
}: {
  data: { name: string; value: number }[];
  center: string;
}) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const chartData = total > 0 ? data : [{ name: "—", value: 1 }];

  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie
          data={chartData}
          dataKey="value"
          nameKey="name"
          cx="50%"
          cy="50%"
          innerRadius="58%"
          outerRadius="82%"
          paddingAngle={total > 0 ? 3 : 0}
          stroke="none"
        >
          {chartData.map((_, i) => (
            <Cell
              key={i}
              fill={total > 0 ? PIE_COLORS[i % PIE_COLORS.length] : COLORS.slate}
            />
          ))}
          <Label
            content={({ viewBox }) => {
              if (!viewBox || !("cx" in viewBox)) {
                return null;
              }
              const { cx, cy } = viewBox as { cx: number; cy: number };
              return (
                <text x={cx} y={cy} textAnchor="middle" dominantBaseline="middle">
                  <tspan
                    x={cx}
                    y={cy - 4}
                    fill="currentColor"
                    fontSize={24}
                    fontWeight={700}
                  >
                    {center}
                  </tspan>
                </text>
              );
            }}
          />
        </Pie>
        <Tooltip content={<ChartTooltip />} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function AdminAnalyticsDashboard() {
  const t = useTranslations("admin");
  const locale = useLocale();
  const uid = useId().replace(/:/g, "");
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [issuesOpen, setIssuesOpen] = useState(false);
  const [dismissingId, setDismissingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    const locale = document.documentElement.lang || "uk";
    const res = await appFetch(
      `/api/admin/stats?range=${range}&locale=${locale}`,
    );
    const json = await res.json();
    if (!res.ok) {
      setData(null);
      setLoadError(adminApiErrorMessage(json, t));
      setLoading(false);
      return;
    }
    setData(json);
    setLoading(false);
  }, [range, t]);

  const dismissIssue = useCallback(
    async (issue: AdminIssueRow) => {
      setDismissingId(issue.id);
      const res = await appFetch(`/api/admin/users/${issue.id}/dismiss-issue`, {
        method: "POST",
        body: JSON.stringify({ kind: issue.kind }),
      });
      if (res.ok) {
        setData((prev) =>
          prev
            ? { ...prev, issues: prev.issues.filter((row) => row.id !== issue.id) }
            : prev,
        );
      } else {
        const json = await res.json();
        setLoadError(adminApiErrorMessage(json, t));
      }
      setDismissingId(null);
    },
    [t],
  );

  const dismissAllIssues = useCallback(async () => {
    const pending = data?.issues ?? [];
    if (pending.length === 0) {
      return;
    }
    setDismissingId("all");
    for (const issue of pending) {
      const res = await appFetch(`/api/admin/users/${issue.id}/dismiss-issue`, {
        method: "POST",
        body: JSON.stringify({ kind: issue.kind }),
      });
      if (!res.ok) {
        const json = await res.json();
        setLoadError(adminApiErrorMessage(json, t));
        setDismissingId(null);
        await load();
        return;
      }
    }
    setData((prev) => (prev ? { ...prev, issues: [] } : prev));
    setDismissingId(null);
  }, [data?.issues, load, t]);

  useEffect(() => {
    load();
  }, [load]);

  const labels = useMemo(
    () => ({
      active: t("distActive"),
      banned: t("distBanned"),
      expired: t("distExpired"),
      USER: "User",
      ADMIN: "Admin",
      user: t("distUserCalcs"),
      template: t("distTemplates"),
    }),
    [t],
  );

  const toPie = useCallback(
    (items: { key: string; value: number }[]) =>
      items
        .filter((i) => i.value > 0)
        .map((i) => ({ name: labels[i.key as keyof typeof labels] ?? i.key, value: i.value })),
    [labels],
  );

  if (loading && !data) {
    return (
      <div className="grid animate-pulse gap-4 md:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div key={i} className="h-20 rounded-xl bg-muted" />
        ))}
        <div className="md:col-span-3 h-[280px] rounded-2xl bg-muted" />
        <div className="h-[240px] rounded-2xl bg-muted md:col-span-1" />
        <div className="h-[240px] rounded-2xl bg-muted md:col-span-1" />
        <div className="h-[240px] rounded-2xl bg-muted md:col-span-1" />
      </div>
    );
  }

  if (!data?.summary) {
    return (
      <AdminErrorAlert message={loadError ?? t("serviceUnavailable")} />
    );
  }

  const { summary, growth } = data;

  const activityData = growth.users.map((point, i) => ({
    label: point.label,
    users: point.value,
    calcs: growth.calculators[i]?.value ?? 0,
  }));

  const topUsersChart = data.topUsers.slice(0, 6).map((u) => ({
    name: u.email.split("@")[0],
    value: u.calculatorsCount,
  }));

  const quotaChart = data.quotaHistogram.map((d) => ({
    name: d.key,
    value: d.value,
  }));

  const issueCount = data.issues.length;

  return (
    <div className="space-y-4">
      <IssuesDetailsModal
        open={issuesOpen}
        issues={data.issues}
        locale={locale}
        dismissingId={dismissingId}
        onClose={() => setIssuesOpen(false)}
        onDismiss={dismissIssue}
        onDismissAll={dismissAllIssues}
      />
      <AdminErrorAlert message={loadError} />
      <div className="flex flex-wrap items-center justify-end gap-2">
        <div className="inline-flex rounded-xl border border-border bg-muted/30 p-0.5">
          {RANGES.map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setRange(r)}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                range === r
                  ? "bg-accent text-accent-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t(`range_${r}`)}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={load}
          disabled={loading}
          className="rounded-xl border border-border px-3 py-1.5 text-xs text-muted-foreground hover:bg-muted"
          aria-label={t("refresh")}
        >
          ↻
        </button>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatPill value={summary.users} label={t("kpiUsers")} color={COLORS.accent} />
        <StatPill
          value={summary.activeUsers}
          label={t("kpiActive")}
          delta={summary.newUsersInRange}
        />
        <StatPill
          value={summary.calculators}
          label={t("kpiCalcs")}
          delta={summary.newCalculatorsInRange}
          color={COLORS.blue}
        />
        <StatPill value={summary.publicCalculators} label={t("kpiPublic")} />
        <StatPill
          value={issueCount}
          label={t("kpiIssues")}
          color={issueCount > 0 ? COLORS.rose : undefined}
          onClick={() => setIssuesOpen(true)}
        />
      </div>

      <Panel title={t("chartActivity")} height={300} className="col-span-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={activityData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }}>
            <defs>
              <linearGradient id={`${uid}-u`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.accent} stopOpacity={0.35} />
                <stop offset="100%" stopColor={COLORS.accent} stopOpacity={0} />
              </linearGradient>
              <linearGradient id={`${uid}-c`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={COLORS.blue} stopOpacity={0.25} />
                <stop offset="100%" stopColor={COLORS.blue} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              allowDecimals={false}
              tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
              axisLine={false}
              tickLine={false}
              width={28}
            />
            <Tooltip content={<ChartTooltip />} />
            <Area
              type="monotone"
              dataKey="users"
              name={t("kpiUsers")}
              stroke={COLORS.accent}
              fill={`url(#${uid}-u)`}
              strokeWidth={2}
            />
            <Area
              type="monotone"
              dataKey="calcs"
              name={t("kpiCalcs")}
              stroke={COLORS.blue}
              fill={`url(#${uid}-c)`}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
      </Panel>

      <div className="grid gap-4 md:grid-cols-3">
        <Panel title={t("chartUserStatus")} height={220}>
          <DonutChart
            data={toPie(data.distribution.userStatus)}
            center={String(summary.users)}
          />
        </Panel>
        <Panel title={t("chartCalculatorTypes")} height={220}>
          <DonutChart
            data={toPie(data.distribution.calculatorTypes)}
            center={String(summary.calculators + summary.templates)}
          />
        </Panel>
        <Panel title={t("chartRoles")} height={220}>
          <DonutChart
            data={toPie(data.distribution.userRoles)}
            center={String(summary.admins)}
          />
        </Panel>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Panel title={t("chartQuota")} height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={quotaChart} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" vertical={false} />
              <XAxis
                dataKey="name"
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <YAxis
                allowDecimals={false}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
                width={24}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="value"
                name={t("kpiUsers")}
                fill={COLORS.accent}
                radius={[6, 6, 0, 0]}
                maxBarSize={48}
              />
            </BarChart>
          </ResponsiveContainer>
        </Panel>

        <Panel title={t("chartTopUsers")} height={220}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={topUsersChart}
              layout="vertical"
              margin={{ top: 0, right: 12, left: 4, bottom: 0 }}
            >
              <CartesianGrid stroke="var(--border)" strokeDasharray="4 4" horizontal={false} />
              <XAxis type="number" hide />
              <YAxis
                type="category"
                dataKey="name"
                width={72}
                tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
                axisLine={false}
                tickLine={false}
              />
              <Tooltip content={<ChartTooltip />} />
              <Bar
                dataKey="value"
                name={t("kpiCalcs")}
                fill={COLORS.blue}
                radius={[0, 6, 6, 0]}
                barSize={14}
              />
            </BarChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      <div className="flex flex-wrap justify-center gap-4 pt-1 text-[10px] text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: COLORS.accent }} />
          {t("kpiUsers")}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2 rounded-full" style={{ background: COLORS.blue }} />
          {t("kpiCalcs")}
        </span>
      </div>
    </div>
  );
}
