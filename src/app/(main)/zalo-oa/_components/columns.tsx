import { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import {
  SelectionToggle,
  getFilteredSelectionState,
  toggleFilteredRows,
} from "@/components/data-table/selection-toggle";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { UsersOA } from "./schema";
import { TableCellViewer } from "./table-cell-viewer";

export const dashboardColumns: ColumnDef<UsersOA>[] = [
  // Checkbox chọn nhiều dòng
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
        <SelectionToggle checked={row.getIsSelected()} onToggle={() => row.toggleSelected()} ariaLabel="Chon dong" />
      </div>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 44,
    minSize: 44,
    maxSize: 44,
  },

  // Tên hiển thị
  {
    accessorKey: "alias",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tên hiển thị" />,
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate">
        <TableCellViewer item={row.original} />
      </div>
    ),
    enableSorting: false,
  },

  // Mã người dùng
  {
    accessorKey: "user_id",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mã người dùng" />,
    cell: ({ row }) => <span className="block max-w-[300px] truncate">{row.original.user_id}</span>,
    enableSorting: false,
  },

  // Điện thoại
  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Điện thoại" />,
    cell: ({ row }) => <span className="block max-w-[300px] truncate font-mono">{row.original.phone}</span>,
    enableSorting: false,
  },

  // Theo dõi
  {
    accessorKey: "follower",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Theo dõi" />,
    cell: ({ row }) => <span className="block max-w-[300px] truncate">{row.original.follower}</span>,
    enableSorting: false,
  },

  // Nhạy cảm
  {
    accessorKey: "is_sensitive",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nhạy cảm" />,
    cell: ({ row }) => <span className="block max-w-[300px] truncate">{row.original.is_sensitive}</span>,
    enableSorting: false,
  },

  // Thành phố
  {
    accessorKey: "city",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Thành phố" />,
    cell: ({ row }) => <span className="block max-w-[300px] truncate">{row.original.city}</span>,
    enableSorting: false,
  },

  // Quận/Huyện
  {
    accessorKey: "district",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Quận/Huyện" />,
    cell: ({ row }) => <span className="block max-w-[300px] truncate">{row.original.district}</span>,
    enableSorting: false,
  },

  // Địa chỉ
  {
    accessorKey: "address",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Địa chỉ" />,
    cell: ({ row }) => <span className="block max-w-[300px] truncate">{row.original.address}</span>,
    enableSorting: false,
  },

  // Actions
  {
    id: "actions",
    cell: () => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="data-[state=open]:bg-muted text-muted-foreground flex size-8" size="icon">
            <EllipsisVertical />
            <span className="sr-only">Mở menu</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-32">
          <DropdownMenuItem>Xem chi tiết</DropdownMenuItem>
          <DropdownMenuItem>Tạo bản sao</DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem variant="destructive">Xóa</DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    ),
    enableSorting: false,
  },
];
