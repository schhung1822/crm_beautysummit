import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import {
  SelectionToggle,
  getFilteredSelectionState,
  toggleFilteredRows,
} from "@/components/data-table/selection-toggle";

import { RowActionsCell } from "./row-actions-cell";
import { Academy } from "./schema";
import { TableCellViewer } from "./table-cell-viewer";
import { VoteOptionRecord } from "@/lib/vote-options";

type OnDeleteRow = (row: Academy) => Promise<void> | void;

function formatGender(value?: string | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "f" || normalized === "female" || normalized === "nu" || normalized === "nữ") {
    return "Nữ";
  }

  if (normalized === "m" || normalized === "male" || normalized === "nam") {
    return "Nam";
  }

  return value ?? "";
}

export const dashboardColumns = (onDeleteRow?: OnDeleteRow, voteOptions?: VoteOptionRecord[]): ColumnDef<Academy>[] => [
  {
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
        <SelectionToggle checked={row.getIsSelected()} onToggle={() => row.toggleSelected()} ariaLabel="Chọn dòng" />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 44,
    minSize: 44,
    maxSize: 44,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tên" />,
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate">
        <TableCellViewer item={row.original} voteOptions={voteOptions} />
      </div>
    ),
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Tên" },
  },
  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Số điện thoại" />,
    cell: ({ row }) => <span className="font-mono">{row.original.phone}</span>,
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Số điện thoại" },
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => <span>{row.original.email}</span>,
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Email" },
  },
  {
    accessorKey: "ordercode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mã đơn" />,
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.ordercode}</span>,
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Mã đơn" },
  },
  {
    accessorKey: "brand_name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Thương hiệu" />,
    cell: ({ row }) => (
      <span className="rounded-md border border-pink-500/40 bg-pink-500/10 px-2 py-1 text-xs font-medium text-pink-700">
        {row.original.brand_name}
      </span>
    ),
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Thương hiệu" },
  },
  {
    accessorKey: "category",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Danh mục" />,
    cell: ({ row }) => <span>{row.original.category}</span>,
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Danh mục" },
  },
  {
    accessorKey: "product",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sản phẩm" />,
    cell: ({ row }) => <span>{row.original.product}</span>,
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Sản phẩm" },
  },
  {
    accessorKey: "gender",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Giới tính" />,
    cell: ({ row }) => <span>{formatGender(row.original.gender)}</span>,
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Giới tính" },
  },
  {
    accessorKey: "time_vote",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Thời gian" />,
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.time_vote
          ? row.original.time_vote instanceof Date
            ? row.original.time_vote.toLocaleDateString("en-GB")
            : row.original.time_vote
          : ""}
      </span>
    ),
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Thời gian" },
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActionsCell row={row.original} onDeleteRow={onDeleteRow} voteOptions={voteOptions} />,
    enableSorting: false,
    size: 64,
    minSize: 64,
    maxSize: 64,
  },
];
