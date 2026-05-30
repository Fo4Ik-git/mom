"use client";

import { Fragment, type ReactNode } from "react";
import { Button } from "@/app/components/ui/button";
import { Card, CardTitle } from "@/app/components/ui/card";
import {
  TABLE_PAGE_SIZES,
  tableRange,
  type TablePageSize,
  type TablePagination,
} from "@/lib/ui/table-pagination";

export type DataTableColumn<T> = {
  id: string;
  header: ReactNode;
  cell: (row: T) => ReactNode;
  headerClassName?: string;
  cellClassName?: string;
};

export type DataTableLabels = {
  loading: string;
  noResults: string;
  refresh?: string;
  formatShowing: (from: number, to: number, total: number) => string;
  formatPage: (page: number, pages: number) => string;
  pageSize: string;
  prev: string;
  next: string;
};

export type DataTableProps<T> = {
  title?: ReactNode;
  columns: DataTableColumn<T>[];
  rows: T[];
  rowKey: (row: T) => string;
  labels: DataTableLabels;
  pagination: TablePagination;
  pageSize: TablePageSize;
  loading?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: TablePageSize) => void;
  onRefresh?: () => void;
  pageSizes?: readonly TablePageSize[];
  toolbar?: ReactNode;
  minTableWidth?: string;
  renderRowDetail?: (row: T) => ReactNode | null;
  renderMobileCard?: (row: T) => ReactNode;
};

export function DataTable<T>({
  title,
  columns,
  rows,
  rowKey,
  labels,
  pagination,
  pageSize,
  loading = false,
  onPageChange,
  onPageSizeChange,
  onRefresh,
  pageSizes = TABLE_PAGE_SIZES,
  toolbar,
  minTableWidth = "800px",
  renderRowDetail,
  renderMobileCard,
}: DataTableProps<T>) {
  const { from, to } = tableRange(pagination);
  const colSpan = columns.length;
  const summary =
    loading
      ? labels.loading
      : pagination.total === 0
        ? labels.noResults
        : labels.formatShowing(from, to, pagination.total);

  function renderTableRow(row: T) {
    const detail = renderRowDetail?.(row);
    return (
      <Fragment key={rowKey(row)}>
        <tr className="border-b border-border/60">
          {columns.map((column) => (
            <td
              key={column.id}
              className={`px-4 py-3 ${column.cellClassName ?? ""}`.trim()}
            >
              {column.cell(row)}
            </td>
          ))}
        </tr>
        {detail && (
          <tr>
            <td colSpan={colSpan} className="p-0">
              {detail}
            </td>
          </tr>
        )}
      </Fragment>
    );
  }

  return (
    <Card className="overflow-hidden p-0">
      <div className="space-y-3 border-b border-border p-4">
        <div className="flex items-start justify-between gap-3">
          {title ? (
            <CardTitle className="mb-0 min-w-0 flex-1">{title}</CardTitle>
          ) : (
            <div className="min-w-0 flex-1" />
          )}
          {onRefresh && (
            <Button
              type="button"
              variant="outline"
              className="h-9 shrink-0 px-3 text-xs"
              disabled={loading}
              onClick={() => onRefresh()}
              aria-label={labels.refresh}
            >
              {labels.refresh ?? "↻"}
            </Button>
          )}
        </div>
        {toolbar}
        <p className="text-sm text-muted-foreground">{summary}</p>
      </div>

      {loading ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          {labels.loading}
        </p>
      ) : rows.length === 0 ? (
        <p className="px-4 py-10 text-center text-sm text-muted-foreground">
          {labels.noResults}
        </p>
      ) : (
        <>
          {renderMobileCard && (
            <div className="divide-y divide-border lg:hidden">
              {rows.map((row) => (
                <Fragment key={rowKey(row)}>{renderMobileCard(row)}</Fragment>
              ))}
            </div>
          )}

          <div
            className={`overflow-x-auto ${renderMobileCard ? "hidden lg:block" : ""}`}
          >
            <table
              className="w-full text-left text-sm"
              style={{ minWidth: minTableWidth }}
            >
              <thead className="border-b border-border bg-muted/40">
                <tr>
                  {columns.map((column) => (
                    <th
                      key={column.id}
                      className={`px-4 py-3 font-medium ${column.headerClassName ?? ""}`.trim()}
                    >
                      {column.header}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>{rows.map(renderTableRow)}</tbody>
            </table>
          </div>
        </>
      )}

      <div className="flex flex-col gap-3 border-t border-border p-4">
        <p className="text-sm text-muted-foreground">
          {labels.formatPage(pagination.page, pagination.totalPages)}
        </p>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <label className="flex flex-col gap-1 text-sm sm:flex-row sm:items-center sm:gap-2">
            <span className="text-muted-foreground">{labels.pageSize}</span>
            <select
              value={pageSize}
              onChange={(e) =>
                onPageSizeChange(Number(e.target.value) as TablePageSize)
              }
              className="h-11 w-full rounded-xl border border-border bg-input px-3 text-base sm:h-10 sm:w-32 sm:text-sm"
            >
              {pageSizes.map((size) => (
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
              disabled={loading || pagination.page <= 1}
              onClick={() => onPageChange(Math.max(1, pagination.page - 1))}
            >
              {labels.prev}
            </Button>
            <Button
              type="button"
              variant="outline"
              className="h-10 flex-1 sm:flex-none"
              disabled={loading || pagination.page >= pagination.totalPages}
              onClick={() =>
                onPageChange(
                  Math.min(pagination.totalPages, pagination.page + 1),
                )
              }
            >
              {labels.next}
            </Button>
          </div>
        </div>
      </div>
    </Card>
  );
}
