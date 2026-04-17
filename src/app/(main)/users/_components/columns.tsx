import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Badge } from "@/components/ui/badge";

import { RowActionsCell } from "./row-actions-cell";
import type { AccountUser } from "./schema";
import { TableCellViewer } from "./table-cell-viewer";

function getRoleBadgeClass(role: string) {
  const normalized = role.trim().toLowerCase();

  if (normalized === "admin") return "border-rose-200 bg-rose-50 text-rose-700";
  if (normalized === "staff") return "border-sky-200 bg-sky-50 text-sky-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

function getStatusBadgeClass(status: string) {
  const normalized = status.trim().toLowerCase();

  if (normalized === "active") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (normalized === "inactive") return "border-amber-200 bg-amber-50 text-amber-700";
  if (normalized === "blocked") return "border-red-200 bg-red-50 text-red-700";
  return "border-slate-200 bg-slate-50 text-slate-700";
}

const formatDate = (value: Date | null) => (value ? value.toLocaleString("en-GB") : "--");

export const dashboardColumns = (
  onRowUpdated?: (updated: AccountUser) => void,
  onDeleteRow?: (row: AccountUser) => Promise<void> | void,
): ColumnDef<AccountUser>[] => [
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ho ten" />,
    cell: ({ row }) => (
      <div className="max-w-[240px] truncate">
        <TableCellViewer item={row.original} onUpdated={onRowUpdated} />
      </div>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "username",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Username" />,
    cell: ({ row }) => <span className="block max-w-[180px] truncate font-medium">{row.original.username}</span>,
    enableSorting: false,
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => <span className="block max-w-[220px] truncate">{row.original.email}</span>,
    enableSorting: false,
  },
  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Dien thoai" />,
    cell: ({ row }) => <span className="block max-w-[160px] truncate font-mono">{row.original.phone || "--"}</span>,
    enableSorting: false,
  },
  {
    accessorKey: "role",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vai tro" />,
    cell: ({ row }) => (
      <Badge variant="outline" className={`rounded-full px-2.5 py-0.5 text-xs ${getRoleBadgeClass(row.original.role)}`}>
        {row.original.role || "--"}
      </Badge>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Trang thai" />,
    cell: ({ row }) => (
      <Badge
        variant="outline"
        className={`rounded-full px-2.5 py-0.5 text-xs ${getStatusBadgeClass(row.original.status)}`}
      >
        {row.original.status || "--"}
      </Badge>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "last_login",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Dang nhap cuoi" />,
    cell: ({ row }) => (
      <span className="block max-w-[190px] truncate text-sm">{formatDate(row.original.last_login)}</span>
    ),
    enableSorting: false,
  },
  {
    accessorKey: "create_time",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ngay tao" />,
    cell: ({ row }) => (
      <span className="block max-w-[190px] truncate text-sm">{formatDate(row.original.create_time)}</span>
    ),
    enableSorting: false,
  },
  {
    id: "actions",
    cell: ({ row }) => <RowActionsCell row={row.original} onRowUpdated={onRowUpdated} onDeleteRow={onDeleteRow} />,
    enableSorting: false,
  },
];
