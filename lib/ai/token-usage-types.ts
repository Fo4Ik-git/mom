export type GeminiTokenUsage = {
  model: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
};

export type AiQuotaSnapshot = {
  hasAccess: boolean;
  unlimited: boolean;
  period: "DAY" | "WEEK" | "MONTH";
  usedInPeriod: number;
  quota: number | null;
  remaining: number | null;
  periodStart: string;
  periodEnd: string;
  usedAllTime: number;
};
