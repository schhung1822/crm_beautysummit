"use client";

import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type PaginationControlsProps = {
  canNextPage: boolean;
  canPreviousPage: boolean;
  currentPage: number;
  idPrefix?: string;
  onNextPage: () => void;
  onPageFirst: () => void;
  onPageLast: () => void;
  onPageSizeChange: (pageSize: number) => void;
  onPreviousPage: () => void;
  pageCount: number;
  pageSize: number;
  pageSizeOptions?: readonly number[];
};

const DEFAULT_PAGE_SIZE_OPTIONS = [10, 20, 30, 40, 50] as const;

export function PaginationControls({
  canNextPage,
  canPreviousPage,
  currentPage,
  idPrefix = "data-table",
  onNextPage,
  onPageFirst,
  onPageLast,
  onPageSizeChange,
  onPreviousPage,
  pageCount,
  pageSize,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
}: PaginationControlsProps) {
  const rowsPerPageId = `${idPrefix}-rows-per-page`;

  return (
    <div className="flex w-full items-center gap-8 lg:w-fit">
      <div className="hidden items-center gap-2 lg:flex">
        <Label htmlFor={rowsPerPageId} className="text-sm font-medium">
          Số hàng mỗi trang
        </Label>
        <Select value={String(pageSize)} onValueChange={(value) => onPageSizeChange(Number(value))}>
          <SelectTrigger size="sm" className="w-20" id={rowsPerPageId}>
            <SelectValue placeholder={String(pageSize)} />
          </SelectTrigger>
          <SelectContent side="top">
            {pageSizeOptions.map((size) => (
              <SelectItem key={size} value={String(size)}>
                {size}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex w-fit items-center justify-center gap-2 text-sm font-medium">
        <span>
          Trang {currentPage} / {pageCount}
        </span>
      </div>

      <div className="ml-auto flex items-center gap-2 lg:ml-0">
        <Button
          type="button"
          variant="outline"
          className="size-8"
          size="icon"
          onClick={onPageFirst}
          disabled={!canPreviousPage}
        >
          <span className="sr-only">Trang đầu</span>
          <ChevronsLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="size-8"
          size="icon"
          onClick={onPreviousPage}
          disabled={!canPreviousPage}
        >
          <span className="sr-only">Trang trước</span>
          <ChevronLeft className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="size-8"
          size="icon"
          onClick={onNextPage}
          disabled={!canNextPage}
        >
          <span className="sr-only">Trang sau</span>
          <ChevronRight className="size-4" />
        </Button>
        <Button
          type="button"
          variant="outline"
          className="size-8"
          size="icon"
          onClick={onPageLast}
          disabled={!canNextPage}
        >
          <span className="sr-only">Trang cuối</span>
          <ChevronsRight className="size-4" />
        </Button>
      </div>
    </div>
  );
}
