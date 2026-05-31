import type { AiTokenQuotaPeriod } from "@prisma/client";

export function getQuotaPeriodStart(
  period: AiTokenQuotaPeriod,
  now = new Date(),
): Date {
  const start = new Date(now);
  start.setUTCHours(0, 0, 0, 0);

  if (period === "DAY") {
    return start;
  }

  if (period === "WEEK") {
    const day = start.getUTCDay();
    const daysFromMonday = day === 0 ? 6 : day - 1;
    start.setUTCDate(start.getUTCDate() - daysFromMonday);
    return start;
  }

  start.setUTCDate(1);
  return start;
}

export function getQuotaPeriodEnd(
  period: AiTokenQuotaPeriod,
  periodStart: Date,
): Date {
  const end = new Date(periodStart);

  if (period === "DAY") {
    end.setUTCDate(end.getUTCDate() + 1);
    return end;
  }

  if (period === "WEEK") {
    end.setUTCDate(end.getUTCDate() + 7);
    return end;
  }

  end.setUTCMonth(end.getUTCMonth() + 1);
  return end;
}
