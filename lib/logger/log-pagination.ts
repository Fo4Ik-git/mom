import {
  buildTablePagination,
  type TablePagination,
} from "@/lib/ui/table-pagination";

export const LOG_PAGE_SIZES = [20, 50, 100, 200] as const;
export type LogPageSize = (typeof LOG_PAGE_SIZES)[number];
export const DEFAULT_LOG_PAGE_SIZE: LogPageSize = 50;

export function parseLogPageSize(value: number | undefined): LogPageSize {
  const n = Math.floor(value ?? DEFAULT_LOG_PAGE_SIZE);
  if (LOG_PAGE_SIZES.includes(n as LogPageSize)) {
    return n as LogPageSize;
  }
  return DEFAULT_LOG_PAGE_SIZE;
}

export function parseLogPage(value: number | undefined): number {
  if (!value || !Number.isFinite(value) || value < 1) {
    return 1;
  }
  return Math.floor(value);
}

export function buildLogPagination(
  page: number,
  pageSize: LogPageSize,
  total: number,
): TablePagination {
  return buildTablePagination(page, pageSize, total);
}
