"use client";

import * as React from "react";

import { Table } from "@tanstack/react-table";

import { PaginationControls } from "./pagination-controls";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const safePageIndex = pageCount === 0 ? 0 : Math.min(pageIndex, pageCount - 1);
  const currentPage = pageCount === 0 ? 0 : safePageIndex + 1;
  const canPrev = safePageIndex > 0;
  const canNext = pageCount > 0 && safePageIndex < pageCount - 1;

  function handlePageSizeChange(nextPageSize: number) {
    if (!Number.isFinite(nextPageSize) || nextPageSize <= 0) {
      return;
    }

    table.setPagination((previous) => ({
      ...previous,
      pageIndex: 0,
      pageSize: nextPageSize,
    }));
  }

  return (
    <div className="flex items-center justify-between px-4">
      <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
        {table.getFilteredSelectedRowModel().rows.length} cua {table.getFilteredRowModel().rows.length} hang da chon
      </div>
      <PaginationControls
        canNextPage={canNext}
        canPreviousPage={canPrev}
        currentPage={currentPage}
        onNextPage={() =>
          table.setPagination((previous) => ({
            ...previous,
            pageIndex: Math.min(previous.pageIndex + 1, Math.max(pageCount - 1, 0)),
          }))
        }
        onPageFirst={() => table.setPagination((previous) => ({ ...previous, pageIndex: 0 }))}
        onPageLast={() =>
          table.setPagination((previous) => ({
            ...previous,
            pageIndex: Math.max(pageCount - 1, 0),
          }))
        }
        onPageSizeChange={handlePageSizeChange}
        onPreviousPage={() =>
          table.setPagination((previous) => ({
            ...previous,
            pageIndex: Math.max(previous.pageIndex - 1, 0),
          }))
        }
        pageCount={pageCount}
        pageSize={pageSize}
      />
    </div>
  );
}
