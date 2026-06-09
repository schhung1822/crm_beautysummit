"use client";

/* eslint-disable max-lines */
import * as React from "react";

import {
  DndContext,
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  closestCenter,
  type DragEndEvent,
  type UniqueIdentifier,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, arrayMove, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { ColumnDef, flexRender, type PaginationState, type Table as TanStackTable } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { cn } from "@/lib/utils";

import { DraggableRow } from "./draggable-row";
import { PaginationControls } from "./pagination-controls";

interface DataTableProps<TData, TValue> {
  table: TanStackTable<TData>;
  columns: ColumnDef<TData, TValue>[];
  dndEnabled?: boolean;
  onReorder?: (newData: TData[]) => void;
  className?: string;
  viewportClassName?: string;
  footerClassName?: string;
  pagination?: {
    onPageIndexChange: (pageIndex: number) => void;
    onPageSizeChange: (pageSize: number) => void;
    pageCount: number;
    pageSizeOptions?: readonly number[];
    state: PaginationState;
  };
  stickyFooter?: boolean;
}

function getColumnPixelSize(columnId: string, size: number) {
  if (columnId === "drag") {
    return 40;
  }

  if (columnId === "select") {
    return 44;
  }

  if (columnId === "actions") {
    return 64;
  }

  return size;
}

function getCellTooltipValue(row: { getValue: (columnId: string) => unknown }, columnId: string) {
  const rawValue = row.getValue(columnId);
  if (rawValue == null) {
    return undefined;
  }

  if (typeof rawValue === "string" || typeof rawValue === "number" || typeof rawValue === "boolean") {
    const normalized = String(rawValue).trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  return undefined;
}

function renderTableBody<TData, TValue>({
  rows,
  columns,
  dndEnabled,
  dataIds,
}: {
  rows: ReturnType<TanStackTable<TData>["getRowModel"]>["rows"];
  columns: ColumnDef<TData, TValue>[];
  dndEnabled: boolean;
  dataIds: UniqueIdentifier[];
}) {
  if (!rows.length) {
    return (
      <TableRow>
        <TableCell colSpan={columns.length} className="h-24 text-center">
          No results.
        </TableCell>
      </TableRow>
    );
  }

  if (dndEnabled) {
    return (
      <SortableContext items={dataIds} strategy={verticalListSortingStrategy}>
        {rows.map((row) => (
          <DraggableRow key={row.id} row={row} />
        ))}
      </SortableContext>
    );
  }

  return rows.map((row) => (
    <TableRow
      key={row.id}
      data-state={row.getIsSelected() && "selected"}
      className="data-[state=selected]:bg-emerald-500/10"
    >
      {row.getVisibleCells().map((cell) => {
        const columnSize = getColumnPixelSize(cell.column.id, cell.column.getSize());

        return (
          <TableCell
            key={cell.id}
            style={{ width: columnSize, maxWidth: columnSize }}
            title={
              cell.column.id === "select" || cell.column.id === "actions"
                ? undefined
                : getCellTooltipValue(row, cell.column.id)
            }
            className={
              cell.column.id === "drag"
                ? "w-10 max-w-10 min-w-10 p-0 text-center"
                : cell.column.id === "select"
                  ? "w-11 max-w-11 min-w-11 p-0 text-center"
                  : cell.column.id === "actions"
                    ? "w-16 max-w-16 min-w-16"
                    : "max-w-0"
            }
          >
            {cell.column.id === "select" || cell.column.id === "actions" ? (
              flexRender(cell.column.columnDef.cell, cell.getContext())
            ) : (
              <div className="max-w-full min-w-0 overflow-hidden text-ellipsis whitespace-nowrap [&>*]:max-w-full">
                {flexRender(cell.column.columnDef.cell, cell.getContext())}
              </div>
            )}
          </TableCell>
        );
      })}
    </TableRow>
  ));
}

export function DataTable<TData, TValue>({
  table,
  columns,
  dndEnabled = false,
  onReorder,
  className,
  viewportClassName,
  footerClassName,
  pagination,
  stickyFooter = false,
}: DataTableProps<TData, TValue>) {
  const { pageIndex, pageSize } = table.getState().pagination;

  const pageRows = table.getRowModel().rows;
  const pageCount = pagination?.pageCount ?? table.getPageCount();
  const footerPageIndex = pagination?.state.pageIndex ?? pageIndex;
  const footerPageSize = pagination?.state.pageSize ?? pageSize;
  const safePageIndex = pageCount === 0 ? 0 : Math.min(footerPageIndex, pageCount - 1);
  const dataIds: UniqueIdentifier[] = pageRows.map((row) => row.id as UniqueIdentifier);
  const selectionEnabled = table.options.enableRowSelection !== false;

  const sortableId = React.useId();
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const canPrev = safePageIndex > 0;
  const canNext = pageCount > 0 && safePageIndex < pageCount - 1;
  const currentPage = pageCount === 0 ? 0 : safePageIndex + 1;

  function handlePageSizeChange(nextPageSize: number) {
    if (!Number.isFinite(nextPageSize) || nextPageSize <= 0) {
      return;
    }

    if (pagination) {
      pagination.onPageSizeChange(nextPageSize);
      return;
    }

    table.setPagination((previous) => ({ ...previous, pageIndex: 0, pageSize: nextPageSize }));
  }

  function goToPreviousPage() {
    const nextPageIndex = Math.max(safePageIndex - 1, 0);
    if (pagination) {
      pagination.onPageIndexChange(nextPageIndex);
      return;
    }

    table.setPagination((previous) => ({
      ...previous,
      pageIndex: nextPageIndex,
    }));
  }

  function goToFirstPage() {
    if (pagination) {
      pagination.onPageIndexChange(0);
      return;
    }

    table.setPagination((previous) => ({ ...previous, pageIndex: 0 }));
  }

  function goToNextPage() {
    const nextPageIndex = Math.min(safePageIndex + 1, Math.max(pageCount - 1, 0));
    if (pagination) {
      pagination.onPageIndexChange(nextPageIndex);
      return;
    }

    table.setPagination((previous) => ({
      ...previous,
      pageIndex: nextPageIndex,
    }));
  }

  function goToLastPage() {
    const lastPageIndex = Math.max(pageCount - 1, 0);
    if (pagination) {
      pagination.onPageIndexChange(lastPageIndex);
      return;
    }

    table.setPagination((previous) => ({ ...previous, pageIndex: lastPageIndex }));
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id || !onReorder) {
      return;
    }

    const oldIndex = dataIds.indexOf(active.id);
    const newIndex = dataIds.indexOf(over.id);
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }

    const newData = arrayMove(table.options.data, oldIndex, newIndex);
    onReorder(newData);
  }

  const tableElement = (
    <Table containerClassName={stickyFooter ? "nice-scroll h-full overflow-auto" : undefined}>
      <TableHeader className="bg-muted sticky top-0 z-10">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead
                key={header.id}
                colSpan={header.colSpan}
                style={{
                  width: getColumnPixelSize(header.column.id, header.getSize()),
                  maxWidth: getColumnPixelSize(header.column.id, header.getSize()),
                }}
                className={
                  header.column.id === "drag"
                    ? "w-10 max-w-10 min-w-10 p-0 text-center"
                    : header.column.id === "select"
                      ? "w-11 max-w-11 min-w-11 p-0 text-center"
                      : header.column.id === "actions"
                        ? "w-16 max-w-16 min-w-16"
                        : undefined
                }
              >
                <div
                  style={{
                    width: getColumnPixelSize(header.column.id, header.getSize()),
                    maxWidth: getColumnPixelSize(header.column.id, header.getSize()),
                  }}
                  className="min-w-0 overflow-hidden text-ellipsis whitespace-nowrap"
                >
                  {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
                </div>
              </TableHead>
            ))}
          </TableRow>
        ))}
      </TableHeader>
      <TableBody className="**:data-[slot=table-cell]:first:w-8">
        {renderTableBody({
          rows: pageRows,
          columns,
          dndEnabled,
          dataIds,
        })}
      </TableBody>
    </Table>
  );

  const content = dndEnabled ? (
    <DndContext
      collisionDetection={closestCenter}
      modifiers={[restrictToVerticalAxis]}
      onDragEnd={handleDragEnd}
      sensors={sensors}
      id={sortableId}
    >
      {tableElement}
    </DndContext>
  ) : (
    tableElement
  );

  return (
    <div className={cn("flex min-h-0 min-w-0 max-w-full flex-col gap-2 overflow-hidden", className)}>
      <div
        className={cn(
          "scrollbar-thin scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/60 min-w-0 max-w-full overflow-hidden rounded-lg border",
          stickyFooter && "min-h-0 flex-1 basis-0",
          viewportClassName,
        )}
      >
        {content}
      </div>

      <div
        className={cn(
          "flex items-center justify-between px-4 py-2",
          stickyFooter && "supports-backdrop-filter:bg-background/80 bg-background/95 sticky bottom-0 z-10 border rounded-lg backdrop-blur",
          footerClassName,
        )}
      >
        {selectionEnabled ? (
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {selectedCount} của {totalFiltered} hàng đã chọn
          </div>
        ) : (
          <div className="hidden flex-1 lg:flex" />
        )}

        <PaginationControls
          canNextPage={canNext}
          canPreviousPage={canPrev}
          currentPage={currentPage}
          onNextPage={goToNextPage}
          onPageFirst={goToFirstPage}
          onPageLast={goToLastPage}
          onPageSizeChange={handlePageSizeChange}
          onPreviousPage={goToPreviousPage}
          pageCount={pageCount}
          pageSize={footerPageSize}
          pageSizeOptions={pagination?.pageSizeOptions}
        />
      </div>
    </div>
  );
}

