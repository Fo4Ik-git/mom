import { Role } from "@prisma/client";
import { db } from "@/lib/db";
import {
  isBanIssueVisible,
  isExpiredAccessIssueVisible,
} from "@/lib/admin-issues";
import { getPlatformSettings } from "@/lib/platform-settings";
import { isAccessActive } from "@/lib/user-limits";

export type AnalyticsRange = "24h" | "7d" | "30d" | "90d";

export interface TimePoint {
  date: string;
  label: string;
  value: number;
}

export interface NamedValue {
  key: string;
  value: number;
}

export interface TopUserRow {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  calculatorsCount: number;
  accessActive: boolean;
}

export type AdminIssueKind = "banned" | "expired";

export interface AdminIssueRow {
  id: string;
  email: string;
  name: string | null;
  role: Role;
  kind: AdminIssueKind;
  banReason: string | null;
  accessExpiresAt: string | null;
  adminNotes: string | null;
  calculatorsCount: number;
}

export interface AdminAnalytics {
  range: AnalyticsRange;
  generatedAt: string;
  summary: {
    users: number;
    activeUsers: number;
    bannedUsers: number;
    expiredAccess: number;
    admins: number;
    calculators: number;
    templates: number;
    publicCalculators: number;
    privateCalculators: number;
    newUsersInRange: number;
    newCalculatorsInRange: number;
    defaultMaxCalculators: number;
  };
  growth: {
    users: TimePoint[];
    calculators: TimePoint[];
    cumulativeUsers: TimePoint[];
    cumulativeCalculators: TimePoint[];
  };
  distribution: {
    userStatus: NamedValue[];
    userRoles: NamedValue[];
    calculatorTypes: NamedValue[];
    calculatorVisibility: NamedValue[];
  };
  quotaHistogram: NamedValue[];
  topUsers: TopUserRow[];
  issues: AdminIssueRow[];
}

function rangeToMs(range: AnalyticsRange): number {
  const day = 24 * 60 * 60 * 1000;
  switch (range) {
    case "24h":
      return day;
    case "7d":
      return 7 * day;
    case "30d":
      return 30 * day;
    case "90d":
      return 90 * day;
    default:
      return 7 * day;
  }
}

function bucketStep(range: AnalyticsRange): "hour" | "day" {
  return range === "24h" ? "hour" : "day";
}

function startOfBucket(date: Date, step: "hour" | "day"): Date {
  const d = new Date(date);
  if (step === "hour") {
    d.setMinutes(0, 0, 0);
  } else {
    d.setHours(0, 0, 0, 0);
  }
  return d;
}

function addStep(date: Date, step: "hour" | "day"): Date {
  const d = new Date(date);
  if (step === "hour") {
    d.setHours(d.getHours() + 1);
  } else {
    d.setDate(d.getDate() + 1);
  }
  return d;
}

function formatLabel(date: Date, step: "hour" | "day", locale: string): string {
  if (step === "hour") {
    return date.toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString(locale, { day: "numeric", month: "short" });
}

function buildBuckets(range: AnalyticsRange, locale = "uk-UA") {
  const step = bucketStep(range);
  const now = new Date();
  const since = new Date(now.getTime() - rangeToMs(range));
  let cursor = startOfBucket(since, step);
  const buckets: { start: Date; date: string; label: string }[] = [];

  while (cursor <= now) {
    buckets.push({
      start: new Date(cursor),
      date: cursor.toISOString(),
      label: formatLabel(cursor, step, locale),
    });
    cursor = addStep(cursor, step);
  }

  return buckets;
}

function countInBuckets(
  items: { createdAt: Date }[],
  buckets: { start: Date }[],
  step: "hour" | "day",
): number[] {
  const counts = new Array(buckets.length).fill(0);

  for (const item of items) {
    const t = item.createdAt.getTime();
    for (let i = 0; i < buckets.length; i++) {
      const start = buckets[i].start.getTime();
      const end = addStep(buckets[i].start, step).getTime();
      if (t >= start && t < end) {
        counts[i]++;
        break;
      }
    }
  }

  return counts;
}

function toSeries(
  buckets: { date: string; label: string }[],
  counts: number[],
): TimePoint[] {
  return buckets.map((b, i) => ({
    date: b.date,
    label: b.label,
    value: counts[i] ?? 0,
  }));
}

function cumulative(series: TimePoint[]): TimePoint[] {
  let sum = 0;
  return series.map((point) => {
    sum += point.value;
    return { ...point, value: sum };
  });
}

export async function getAdminAnalytics(
  range: AnalyticsRange,
  locale = "uk-UA",
): Promise<AdminAnalytics> {
  const now = new Date();
  const since = new Date(now.getTime() - rangeToMs(range));
  const buckets = buildBuckets(range, locale);
  const step = bucketStep(range);

  const [
    users,
    calculators,
    templates,
    publicCalculators,
    bannedUsers,
    admins,
    expiredAccess,
    platform,
    usersInRange,
    calculatorsInRange,
    allUsers,
    allCalculators,
  ] = await Promise.all([
    db.user.count(),
    db.calculator.count({ where: { isTemplate: false } }),
    db.calculator.count({ where: { isTemplate: true } }),
    db.calculator.count({ where: { isPublic: true, isTemplate: false } }),
    db.user.count({ where: { banned: true } }),
    db.user.count({ where: { role: Role.ADMIN } }),
    db.user.count({
      where: { role: Role.USER, accessExpiresAt: { lt: now } },
    }),
    getPlatformSettings(),
    db.user.findMany({
      where: { createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    db.calculator.findMany({
      where: { isTemplate: false, createdAt: { gte: since } },
      select: { createdAt: true },
    }),
    db.user.findMany({
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        banned: true,
        banReason: true,
        adminNotes: true,
        accessExpiresAt: true,
        issueBanDismissedAt: true,
        issueExpiredDismissedFor: true,
        createdAt: true,
        _count: {
          select: {
            calculators: { where: { isTemplate: false } },
          },
        },
      },
      orderBy: { createdAt: "desc" },
    }),
    db.calculator.findMany({
      select: { isPublic: true, isTemplate: true },
    }),
  ]);

  const userCounts = countInBuckets(usersInRange, buckets, step);
  const calculatorCounts = countInBuckets(calculatorsInRange, buckets, step);
  const usersSeries = toSeries(buckets, userCounts);
  const calculatorsSeries = toSeries(buckets, calculatorCounts);

  const activeUsers = Math.max(0, users - bannedUsers - expiredAccess);
  const privateCalculators = calculators - publicCalculators;

  const regularUsers = allUsers.filter((u) => u.role === Role.USER);
  const quotaBuckets = new Map<string, number>();
  for (const user of regularUsers) {
    const count = user._count.calculators;
    const max = platform.defaultMaxCalculators;
    let key: string;
    if (count === 0) {
      key = "0";
    } else if (count >= max) {
      key = `${max}+`;
    } else {
      key = String(count);
    }
    quotaBuckets.set(key, (quotaBuckets.get(key) ?? 0) + 1);
  }

  const topUsers: TopUserRow[] = [...allUsers]
    .sort((a, b) => b._count.calculators - a._count.calculators)
    .slice(0, 8)
    .map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      role: u.role,
      calculatorsCount: u._count.calculators,
      accessActive: !u.banned && isAccessActive(u),
    }));

  const issues: AdminIssueRow[] = [];
  for (const user of allUsers) {
    const expired = isExpiredAccessIssueVisible(user, now);

    if (isBanIssueVisible(user)) {
      issues.push({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        kind: "banned",
        banReason: user.banReason,
        accessExpiresAt: user.accessExpiresAt?.toISOString() ?? null,
        adminNotes: user.adminNotes,
        calculatorsCount: user._count.calculators,
      });
      continue;
    }

    if (expired) {
      issues.push({
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        kind: "expired",
        banReason: null,
        accessExpiresAt: user.accessExpiresAt!.toISOString(),
        adminNotes: user.adminNotes,
        calculatorsCount: user._count.calculators,
      });
    }
  }

  issues.sort((a, b) => a.email.localeCompare(b.email));

  return {
    range,
    generatedAt: now.toISOString(),
    summary: {
      users,
      activeUsers,
      bannedUsers,
      expiredAccess,
      admins,
      calculators,
      templates,
      publicCalculators,
      privateCalculators,
      newUsersInRange: usersInRange.length,
      newCalculatorsInRange: calculatorsInRange.length,
      defaultMaxCalculators: platform.defaultMaxCalculators,
    },
    growth: {
      users: usersSeries,
      calculators: calculatorsSeries,
      cumulativeUsers: cumulative(usersSeries),
      cumulativeCalculators: cumulative(calculatorsSeries),
    },
    distribution: {
      userStatus: [
        { key: "active", value: activeUsers },
        { key: "banned", value: bannedUsers },
        { key: "expired", value: expiredAccess },
      ],
      userRoles: [
        { key: "USER", value: users - admins },
        { key: "ADMIN", value: admins },
      ],
      calculatorTypes: [
        { key: "user", value: calculators },
        { key: "template", value: templates },
      ],
      calculatorVisibility: [
        { key: "public", value: publicCalculators },
        { key: "private", value: privateCalculators },
        { key: "template", value: templates },
      ],
    },
    quotaHistogram: [...quotaBuckets.entries()]
      .map(([key, value]) => ({ key, value }))
      .sort((a, b) => a.key.localeCompare(b.key, undefined, { numeric: true })),
    topUsers,
    issues,
  };
}
