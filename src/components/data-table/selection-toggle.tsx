import { type ColumnDef, type Table } from "@tanstack/react-table";
import { Check, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

type SelectionToggleProps = {
  checked: boolean;
  indeterminate?: boolean;
  ariaLabel: string;
  onToggle: () => void;
};

export function SelectionToggle({ checked, indeterminate = false, ariaLabel, onToggle }: SelectionToggleProps) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={checked || indeterminate}
      className={cn(
        "flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded-md border transition-colors",
        checked || indeterminate ? "bg-primary text-primary-foreground border-primary" : "border-gray-300 bg-white",
      )}
      onMouseDown={(event) => event.stopPropagation()}
      onClick={(event) => {
        event.stopPropagation();
        onToggle();
      }}
    >
      {checked ? <Check className="size-3" /> : indeterminate ? <Minus className="size-3" /> : null}
    </button>
  );
}

export function getFilteredSelectionState<TData>(table: Table<TData>) {
  const totalCount = table.getFilteredRowModel().rows.length;

  if (!totalCount) {
    return {
      allSelected: false,
      someSelected: false,
      selectedCount: 0,
      totalCount: 0,
    };
  }

  const selectedCount = table.getFilteredSelectedRowModel().rows.length;

  return {
    allSelected: selectedCount === totalCount,
    someSelected: selectedCount > 0 && selectedCount < totalCount,
    selectedCount,
    totalCount,
  };
}

export function toggleFilteredRows<TData>(table: Table<TData>, nextSelected: boolean) {
  const filteredRowIds = table.getFilteredRowModel().rows.map((row) => row.id);

  table.setRowSelection((previous) => {
    const next = { ...previous };

    if (nextSelected) {
      filteredRowIds.forEach((rowId) => {
        next[rowId] = true;
      });
    } else {
      filteredRowIds.forEach((rowId) => {
        delete next[rowId];
      });
    }

    return next;
  });
}

export function buildSelectionColumn<TData>(): ColumnDef<TData> {
  return {
    id: "select",
    header: ({ table }) => {
      const selectionState = getFilteredSelectionState(table);

      return (
        <div className="flex items-center justify-center">
          <SelectionToggle
            checked={selectionState.allSelected}
            indeterminate={selectionState.someSelected}
            onToggle={() => toggleFilteredRows(table, !selectionState.allSelected)}
            ariaLabel="Chọn tất cả"
          />
        </div>
      );
    },
    cell: ({ row }) => (
      <div className="flex items-center justify-center">
        <SelectionToggle checked={row.getIsSelected()} onToggle={() => row.toggleSelected()} ariaLabel="Chon dong" />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 44,
    minSize: 44,
    maxSize: 44,
  };
}

export function withSelectionColumn<TData, TValue>(columns: ColumnDef<TData, TValue>[]): ColumnDef<TData, TValue>[] {
  const filteredColumns = columns.filter((column) => column.id !== "select");
  return [buildSelectionColumn<TData>() as ColumnDef<TData, TValue>, ...filteredColumns];
}
