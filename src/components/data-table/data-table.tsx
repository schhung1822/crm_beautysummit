"use client";

import * as React from "react";

import {
  KeyboardSensor,
  MouseSensor,
  TouchSensor,
  useSensor,
  useSensors,
  DndContext,
  closestCenter,
  type UniqueIdentifier,
  type DragEndEvent,
} from "@dnd-kit/core";
import { restrictToVerticalAxis } from "@dnd-kit/modifiers";
import { SortableContext, verticalListSortingStrategy, arrayMove } from "@dnd-kit/sortable";
import { ColumnDef, flexRender, type Table as TanStackTable } from "@tanstack/react-table";

import { Button } from "@/components/ui/button";
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
      {row.getVisibleCells().map((cell) => (
        <TableCell key={cell.id}>{flexRender(cell.column.columnDef.cell, cell.getContext())}</TableCell>
      ))}
    </TableRow>
  ));
}

export function DataTable<TData, TValue>({
  table,
  columns,
  dndEnabled = false,
  onReorder,
}: DataTableProps<TData, TValue>) {
  // ---- Phân trang cục bộ ----
  const [pageSize, setPageSize] = React.useState(10);
  const [pageIndex, setPageIndex] = React.useState(0);

  const allRows = table.getRowModel().rows; // đã sort/filter xong
  const pageCount = Math.max(1, Math.ceil(allRows.length / pageSize));
  const safePageIndex = Math.min(pageIndex, pageCount - 1);

  const start = safePageIndex * pageSize;
  const end = start + pageSize;
  const pageRows = allRows.slice(start, end);

  const dataIds: UniqueIdentifier[] = pageRows.map((row) => row.id as UniqueIdentifier);

  const sortableId = React.useId();
  const sensors = useSensors(useSensor(MouseSensor, {}), useSensor(TouchSensor, {}), useSensor(KeyboardSensor, {}));

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (active && over && active.id !== over.id && onReorder) {
      const oldIndex = dataIds.indexOf(active.id);
      const newIndex = dataIds.indexOf(over.id);

      const newData = arrayMove(table.options.data, oldIndex, newIndex);
      onReorder(newData);
    }
  }

  const tableElement = (
    <Table>
      <TableHeader className="bg-muted sticky top-0 z-10">
        {table.getHeaderGroups().map((headerGroup) => (
          <TableRow key={headerGroup.id}>
            {headerGroup.headers.map((header) => (
              <TableHead key={header.id} colSpan={header.colSpan}>
                {header.isPlaceholder ? null : flexRender(header.column.columnDef.header, header.getContext())}
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

  // ---- Footer phân trang ----
  const selectedCount = table.getFilteredSelectedRowModel().rows.length;
  const totalFiltered = table.getFilteredRowModel().rows.length;

  const canPrev = safePageIndex > 0;
  const canNext = safePageIndex < pageCount - 1;

  return (
    <div className="flex flex-col gap-2">
      <div className="scrollbar-thin scrollbar-thumb-muted-foreground/40 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/60 overflow-hidden rounded-lg border">
        {content}
      </div>

      <div className="flex items-center justify-between px-4 py-2">
        <div className="text-muted-foreground hidden flex-1 text-sm lg:flex">
          {selectedCount} của {totalFiltered} hàng đã chọn
        </div>

        <div className="flex w-full items-center gap-8 lg:w-fit">
          {/* Số hàng mỗi trang */}
          <div className="hidden items-center gap-2 lg:flex">
            <Label htmlFor="rows-per-page" className="text-sm font-medium">
              Số hàng mỗi trang
            </Label>
            <Select
              value={String(pageSize)}
              onValueChange={(value) => {
                const newSize = Number(value);
                setPageSize(newSize);
                setPageIndex(0); // quay lại trang 1 khi đổi pageSize
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

          {/* Trang X của Y */}
          <div className="flex w-fit items-center justify-center text-sm font-medium">
            Trang {safePageIndex + 1} của {pageCount}
          </div>

          {/* Nút điều hướng */}
          <div className="ml-auto flex items-center gap-2 lg:ml-0">
            <Button
              variant="outline"
              className="hidden h-8 w-8 p-0 lg:flex"
              onClick={() => setPageIndex(0)}
              disabled={!canPrev}
            >
              <span className="sr-only">Trang đầu</span>«
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => canPrev && setPageIndex((p) => p - 1)}
              disabled={!canPrev}
            >
              <span className="sr-only">Trang trước</span>‹
            </Button>
            <Button
              variant="outline"
              className="size-8"
              size="icon"
              onClick={() => canNext && setPageIndex((p) => p + 1)}
              disabled={!canNext}
            >
              <span className="sr-only">Trang tiếp</span>›
            </Button>
            <Button
              variant="outline"
              className="hidden size-8 lg:flex"
              size="icon"
              onClick={() => setPageIndex(pageCount - 1)}
              disabled={!canNext}
            >
              <span className="sr-only">Trang cuối</span>»
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
