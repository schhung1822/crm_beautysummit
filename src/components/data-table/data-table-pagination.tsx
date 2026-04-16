"use client";

import * as React from "react";

import { Table } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface DataTablePaginationProps<TData> {
  table: Table<TData>;
}

export function DataTablePagination<TData>({ table }: DataTablePaginationProps<TData>) {
  const { pageIndex, pageSize } = table.getState().pagination;
  const pageCount = table.getPageCount();
  const [pageInput, setPageInput] = React.useState(() => String(pageCount === 0 ? 0 : pageIndex + 1));
  const [isFocused, setIsFocused] = React.useState(false);

  React.useEffect(() => {
    if (!isFocused) {
      setPageInput(String(pageCount === 0 ? 0 : pageIndex + 1));
    }
  }, [pageCount, pageIndex, isFocused]);

  const commitPageInput = React.useCallback(() => {
    if (pageCount === 0) {
      setPageInput("0");
      return;
    }

    const parsed = Number(pageInput);
    if (!Number.isFinite(parsed) || parsed < 1 || parsed > pageCount) {
      const nextPageNumber = Math.min(Math.max(Math.trunc(parsed), 1), pageCount);
      table.setPageIndex(Number.isFinite(parsed) ? nextPageNumber - 1 : pageIndex);
      setPageInput(String(Number.isFinite(parsed) ? nextPageNumber : pageIndex + 1));
      return;
    }

    table.setPageIndex(parsed - 1);
    setPageInput(String(parsed));
  }, [pageCount, pageIndex, pageInput, table]);

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
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
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
          <span>Trang</span>
          <Input
            value={pageInput}
            inputMode="numeric"
            pattern="[0-9]*"
            className="h-8 w-16 text-center"
            onFocus={() => setIsFocused(true)}
            onChange={(event) => {
              setPageInput(event.target.value.replace(/[^\d]/g, ""));
            }}
            onBlur={() => {
              setIsFocused(false);
              commitPageInput();
            }}
            onKeyDown={(event) => {
              if (event.key === "Enter") {
                event.preventDefault();
                commitPageInput();
              }
            }}
          />
          <span>/ {pageCount}</span>
        </div>

        <div className="ml-auto flex items-center gap-2 lg:ml-0">
          <Button
            variant="outline"
            className="hidden h-8 w-8 p-0 lg:flex"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Trang dau</span>
            <ChevronsLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Trang truoc</span>
            <ChevronLeft />
          </Button>
          <Button
            variant="outline"
            className="size-8"
            size="icon"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Trang tiep</span>
            <ChevronRight />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 lg:flex"
            size="icon"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Trang cuoi</span>
            <ChevronsRight />
          </Button>
        </div>
      </div>
    </div>
  );
}
