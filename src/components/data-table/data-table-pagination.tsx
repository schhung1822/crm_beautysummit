"use client";

import * as React from "react";

import { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

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

  function handlePageSizeChange(value: string) {
    const nextPageSize = Number(value);
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
      <div className="flex w-full items-center gap-8 lg:w-fit">
        <div className="hidden items-center gap-2 lg:flex">
          <Label htmlFor="rows-per-page" className="text-sm font-medium">
            Số hàng mỗi trang
          </Label>
          <Select
            value={String(pageSize)}
            onValueChange={handlePageSizeChange}
          >
            <SelectTrigger size="sm" className="w-20" id="rows-per-page">
              <SelectValue placeholder={String(pageSize)} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((size) => (
                <SelectItem key={size} value={String(size)}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex w-fit items-center justify-center gap-2 text-sm font-medium">
          <span>Trang {currentPage} / {pageCount}</span>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.setPageIndex(Math.max(safePageIndex - 1, 0))}
            disabled={!canPrev}
          >
            <span className="sr-only">Trang truoc</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.setPageIndex(Math.min(safePageIndex + 1, Math.max(pageCount - 1, 0)))}
            disabled={!canNext}
          >
            <span className="sr-only">Trang tiep</span>
            <ChevronRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
