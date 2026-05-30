"use client";

import { useCallback, useEffect, useState } from "react";
import type { TablePageSize, TablePagination } from "@/lib/ui/table-pagination";

export type PaginatedFetchResult<TRow> = {
  rows: TRow[];
  pagination: TablePagination;
};

export function usePaginatedTable<TRow>(options: {
  fetchPage: (params: {
    page: number;
    pageSize: TablePageSize;
    query: string;
  }) => Promise<PaginatedFetchResult<TRow>>;
  initialPageSize?: TablePageSize;
  debounceMs?: number;
}) {
  const { fetchPage, initialPageSize = 10, debounceMs = 300 } = options;

  const [rows, setRows] = useState<TRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState<TablePageSize>(initialPageSize);
  const [pagination, setPagination] = useState<TablePagination>({
    page: 1,
    pageSize: initialPageSize,
    total: 0,
    totalPages: 1,
  });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await fetchPage({ page, pageSize, query: searchQuery });
      setRows(result.rows);
      setPagination(result.pagination);
      if (result.pagination.page !== page) {
        setPage(result.pagination.page);
      }
    } finally {
      setLoading(false);
    }
  }, [fetchPage, page, pageSize, searchQuery]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setSearchQuery(searchInput.trim());
    }, debounceMs);
    return () => window.clearTimeout(timer);
  }, [searchInput, debounceMs]);

  useEffect(() => {
    setPage(1);
  }, [searchQuery, pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  return {
    rows,
    loading,
    pagination,
    page,
    setPage,
    pageSize,
    setPageSize,
    searchInput,
    setSearchInput,
    refresh: load,
  };
}
