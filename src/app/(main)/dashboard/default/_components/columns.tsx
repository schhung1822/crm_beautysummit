import { ColumnDef } from "@tanstack/react-table";
import { EllipsisVertical } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import {
  SelectionToggle,
  getFilteredSelectionState,
  toggleFilteredRows,
} from "@/components/data-table/selection-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

import { Channel } from "./schema";
import { TableCellViewer } from "./table-cell-viewer";

// ---- Stats type ----
export type Stats = {
  totalOrders: number;
  totalMoney: number;
  totalMoneyVAT: number;
};

function formatGender(value?: string | null) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return "Khác";
  if (v === "f" || v === "female" || v === "nữ" || v === "nu") return "Nữ";
  if (v === "m" || v === "male" || v === "nam") return "Nam";
  return "Khác";
}

// ---- Columns factory (nhận stats) ----
export const dashboardColumns = (stats: Stats): ColumnDef<Channel>[] => [
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

  // Mã đơn (đặt lên cột đầu)
  {
    accessorKey: "ordercode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mã đơn" />,
    cell: ({ row }) => <TableCellViewer item={row.original} stats={stats} />,
    enableSorting: false,
  },

  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Họ tên" />,
    cell: ({ row }) => <span className="font-mono">{row.original.name}</span>,
    enableSorting: false,
  },

  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Điện thoại" />,
    cell: ({ row }) => <span className="font-mono">{row.original.phone}</span>,
    enableSorting: false,
  },

  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => <span className="block max-w-[200px] truncate">{row.original.email}</span>,
    enableSorting: false,
  },

  {
    accessorKey: "class",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Lớp" />,
    cell: ({ row }) => <span>{row.original.class}</span>,
    enableSorting: false,
  },

  {
    accessorKey: "gender",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Giới tính" />,
    cell: ({ row }) => <span>{formatGender(row.original.gender)}</span>,
    enableSorting: false,
  },

  {
    accessorKey: "career",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nghề nghiệp" />,
    cell: ({ row }) => <span>{row.original.career}</span>,
    enableSorting: false,
  },

  {
    accessorKey: "money",
    header: ({ column }) => <DataTableColumnHeader className="w-full text-right" column={column} title="Tiền" />,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{(row.original.money || 0).toLocaleString("en-GB")}</div>
    ),
    enableSorting: false,
  },

  {
    accessorKey: "money_VAT",
    header: ({ column }) => <DataTableColumnHeader className="w-full text-right" column={column} title="Tiền (VAT)" />,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{(row.original.money_VAT || 0).toLocaleString("en-GB")}</div>
    ),
    enableSorting: false,
  },

  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Thanh toán" />,
    cell: ({ row }) => {
      const s = String(row.original.status).toLowerCase();
      let className = "bg-muted/20 text-muted-foreground";
      if (s.includes("hoàn thành") || s.includes("thành công") || s.includes("đã thanh toán")) {
        className = "bg-green-600 text-white";
      } else if (s.includes("đang xử lý") || s.includes("chờ")) {
        className = "bg-yellow-500 text-black";
      } else if (s.includes("hủy") || s.includes("không") || s.includes("thất bại")) {
        className = "bg-red-600 text-white";
      }
      return <Badge className={className}>{row.original.status}</Badge>;
    },
    enableSorting: false,
  },

  {
    accessorKey: "status_checkin",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Check-in" />,
    cell: ({ row }) => <Badge variant="secondary">{row.original.status_checkin}</Badge>,
    enableSorting: false,
  },

  {
    accessorKey: "create_time",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ngày tạo" />,
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.create_time
          ? row.original.create_time instanceof Date
            ? row.original.create_time.toLocaleDateString("en-GB")
            : row.original.create_time
          : ""}
      </span>
    ),
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
