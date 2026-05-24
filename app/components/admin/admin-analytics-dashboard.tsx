"use client";

import type { ReactNode } from "react";
import { useTranslations } from "next-intl";
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
import type { AdminAnalytics, AnalyticsRange } from "@/lib/admin-analytics";
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
}: {
  value: number;
  label: string;
  delta?: number;
  color?: string;
}) {
  return (
    <div className="flex min-w-[100px] flex-1 flex-col rounded-xl border border-border/60 bg-card/80 px-4 py-3">
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
    </div>
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
  const uid = useId().replace(/:/g, "");
  const [range, setRange] = useState<AnalyticsRange>("7d");
  const [data, setData] = useState<AdminAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

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

  return (
    <div className="space-y-4">
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
          value={summary.bannedUsers + summary.expiredAccess}
          label={t("kpiIssues")}
          color={summary.bannedUsers + summary.expiredAccess > 0 ? COLORS.rose : undefined}
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
