"use client";

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
import { ColumnDef, flexRender, type Table as TanStackTable } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { DraggableRow } from "./draggable-row";

interface DataTableProps<TData, TValue> {
  table: TanStackTable<TData>;
  columns: ColumnDef<TData, TValue>[];
  dndEnabled?: boolean;
  onReorder?: (newData: TData[]) => void;
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
}: DataTableProps<TData, TValue>) {
  const { pageIndex, pageSize } = table.getState().pagination;

  const pageRows = table.getRowModel().rows;
  const pageCount = table.getPageCount();
  const safePageIndex = pageCount === 0 ? 0 : Math.min(pageIndex, pageCount - 1);
  const dataIds: UniqueIdentifier[] = pageRows.map((row) => row.id as UniqueIdentifier);
  const selectionEnabled = table.options.enableRowSelection !== false;

  const sortableId = React.useId();
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalFiltered = table.getFilteredRowModel().rows.length;
  const canPrev = table.getCanPreviousPage();
  const canNext = table.getCanNextPage();

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
  }, [pageCount, pageInput, pageIndex, table]);

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
    <Table>
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
    <div className="flex flex-col gap-2">
      <div className="scrollbar-thin scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/60 overflow-hidden rounded-lg border">
        {content}
      </div>

      <div className="flex items-center justify-between px-4 py-2">
        {selectionEnabled ? (
          <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
            {selectedCount} của {totalFiltered} hàng đã chọn
          </div>
        ) : (
          <div className="hidden flex-1 lg:flex" />
        )}

        <div className="flex w-full items-center gap-8 lg:w-fit">
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Số hàng mỗi trang
            </Label>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                table.setPageSize(Number(value));
                table.setPageIndex(0);
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
              disabled={!canPrev}
            >
              <span className="sr-only">Trang dau</span>
              <ChevronsLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => {
                if (canPrev) {
                  table.previousPage();
                }
              }}
              disabled={!canPrev}
            >
              <span className="sr-only">Trang truoc</span>
              <ChevronLeft className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => {
                if (canNext) {
                  table.nextPage();
                }
              }}
              disabled={!canNext}
            >
              <span className="sr-only">Trang sau</span>
              <ChevronRight className="size-4" />
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => table.setPageIndex(pageCount - 1)}
              disabled={!canNext}
            >
              <span className="sr-only">Trang cuoi</span>
              <ChevronsRight className="size-4" />
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

