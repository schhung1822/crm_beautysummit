import * as React from "react";

import {
  ColumnDef,
  ColumnFiltersState,
  SortingState,
  VisibilityState,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
} from "@tanstack/react-table";

type UseDataTableInstanceProps<TData, TValue> = {
  data: TData[];
  columns: ColumnDef<TData, TValue>[];
  enableRowSelection?: boolean;
  defaultPageIndex?: number;
  defaultPageSize?: number;
  getRowId?: (row: TData, index: number) => string;
};

export function useDataTableInstance<TData, TValue>({
  data,
  columns,
  enableRowSelection = true,
  defaultPageIndex = 0,
  defaultPageSize = 10,
  getRowId,
}: UseDataTableInstanceProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = React.useState({});
  const [columnVisibility, setColumnVisibility] = React.useState<VisibilityState>(
    () => (enableRowSelection ? {} : { select: false }) as VisibilityState,
  );
  const [columnFilters, setColumnFilters] = React.useState<ColumnFiltersState>([]);
  const [sorting, setSorting] = React.useState<SortingState>([]);

  const table = useReactTable({
    data,
    columns,
    state: {
      sorting,
      columnVisibility,
      rowSelection,
      columnFilters,
    },
    initialState: {
      pagination: {
        pageIndex: defaultPageIndex,
        pageSize: defaultPageSize,
      },
    },
    enableRowSelection,
    enableMultiRowSelection: enableRowSelection,
    autoResetPageIndex: false,
    autoResetExpanded: false,
    getRowId: getRowId ?? ((row, index) => (row as { id?: string | number }).id?.toString() ?? String(index)),
    onRowSelectionChange: setRowSelection,
    onSortingChange: setSorting,
    onColumnFiltersChange: setColumnFilters,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  // Clean up row selection when data changes (rows removed by filter/delete)
  const getRowIdStable = getRowId;
  React.useEffect(() => {
    if (!enableRowSelection) return;

    const nextRowIds = new Set(
      data.map((row, index) =>
        (getRowIdStable ?? ((item, idx) => (item as { id?: string | number }).id?.toString() ?? String(idx)))(
          row,
          index,
        ),
      ),
    );

    setRowSelection((prev) => {
      if (Object.keys(prev).length === 0) return prev;
      const nextEntries = Object.entries(prev).filter(([rowId]) => nextRowIds.has(rowId));
      if (nextEntries.length === Object.keys(prev).length) return prev;
      return Object.fromEntries(nextEntries);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, enableRowSelection]);

  React.useEffect(() => {
    if (enableRowSelection) {
      return;
    }

    setColumnVisibility((prev) => (prev.select === false ? prev : { ...prev, select: false }));
    setRowSelection((prev) => (Object.keys(prev).length === 0 ? prev : {}));
  }, [enableRowSelection]);

  return table;
}
