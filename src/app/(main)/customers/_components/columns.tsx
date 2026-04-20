import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";

import { RowActionsCell } from "./row-actions-cell";
import { type Users } from "./schema";
import { TableCellViewer } from "./table-cell-viewer";
import { formatGender } from "@/lib/utils";

type OnRowUpdated = (updated: Users) => void;
type OnDuplicateRow = (row: Users) => Promise<void> | void;
type OnDeleteRow = (row: Users) => Promise<void> | void;

export const dashboardColumns = (
  onRowUpdated?: OnRowUpdated,
  onDuplicateRow?: OnDuplicateRow,
  onDeleteRow?: OnDeleteRow,
): ColumnDef<Users>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ho ten" />,
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate">
        <TableCellViewer item={row.original} onUpdated={onRowUpdated} />
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "customer_ID",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ma khach hang" />,
    cell: ({ row }) => <span className="block max-w-[240px] truncate">{row.original.customer_ID}</span>,
    enableSorting: false,
  },
  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Dien thoai" />,
    cell: ({ row }) => <span className="block max-w-[180px] truncate font-mono">{row.original.phone}</span>,
    enableSorting: false,
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => <span className="block max-w-[240px] truncate">{row.original.email}</span>,
    enableSorting: false,
  },
  {
    accessorKey: "gender",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Gioi tinh" />,
    cell: ({ row }) => <span className="block max-w-[120px] truncate">{formatGender(row.original.gender)}</span>,
    enableSorting: false,
  },
  {
    accessorKey: "career",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nghe nghiep" />,
    cell: ({ row }) => <span className="block max-w-[220px] truncate">{row.original.career}</span>,
    enableSorting: false,
  },
  {
    accessorKey: "create_time",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ngay tao" />,
    cell: ({ row }) => (
      <span className="block max-w-[180px] truncate text-sm">
        {row.original.create_time instanceof Date
          ? row.original.create_time.toLocaleDateString("en-GB")
          : row.original.create_time}
      </span>
    ),
    enableSorting: false,
  },
  {
    id: "actions",
    cell: ({ row }) => (
      <RowActionsCell
        row={row.original}
        onRowUpdated={onRowUpdated}
        onDuplicateRow={onDuplicateRow}
        onDeleteRow={onDeleteRow}
      />
    ),
    enableSorting: false,
  },
];
