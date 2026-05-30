/** Server/client helpers for paginated tables (fetch one page at a time). */
export const TABLE_PAGE_SIZES = [10, 25, 50, 100] as const;
export type TablePageSize = (typeof TABLE_PAGE_SIZES)[number];

export type TablePagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export function parseTablePageSize(
  value: string | null,
  fallback: TablePageSize = 10,
): TablePageSize {
  const n = Number(value);
  if (TABLE_PAGE_SIZES.includes(n as TablePageSize)) {
    return n as TablePageSize;
  }
  return fallback;
}

export function parseTablePage(value: string | null): number {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 1) {
    return 1;
  }
  return Math.floor(n);
}

export function buildTablePagination(
  page: number,
  pageSize: number,
  total: number,
): TablePagination {
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  return {
    page: Math.min(page, totalPages),
    pageSize,
    total,
    totalPages,
  };
}

export function tableRange(pagination: TablePagination) {
  const from =
    pagination.total === 0
      ? 0
      : (pagination.page - 1) * pagination.pageSize + 1;
  const to = Math.min(
    pagination.page * pagination.pageSize,
    pagination.total,
  );
  return { from, to };
}

export function tableQueryParams(
  page: number,
  pageSize: number,
  query?: string,
): URLSearchParams {
  const params = new URLSearchParams({
    page: String(page),
    pageSize: String(pageSize),
  });
  const q = query?.trim();
  if (q) {
    params.set("q", q);
  }
  return params;
}
