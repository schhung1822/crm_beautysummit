import { ColumnDef } from "@tanstack/react-table";
import { Check, Minus } from "lucide-react";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { cn } from "@/lib/utils";

import { RowActionsCell } from "./row-actions-cell";
import { Academy } from "./schema";
import { TableCellViewer } from "./table-cell-viewer";

type OnDeleteRow = (row: Academy) => Promise<void> | void;

function formatGender(value?: string | null) {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();
  if (v === "f" || v === "female" || v === "nữ" || v === "nu") return "Nữ";
  if (v === "m" || v === "male" || v === "nam") return "Nam";
  return value ?? "";
}

export const dashboardColumns = (onDeleteRow?: OnDeleteRow): ColumnDef<Academy>[] => [
  // Checkbox chọn nhiều dòng
  {
    id: "select",
    header: ({ table }) => {
      const isAllSelected = table.getIsAllPageRowsSelected();
      const isSomeSelected = table.getIsSomePageRowsSelected();
      const isChecked = isAllSelected || isSomeSelected;

      return (
        <div className="flex items-center justify-center">
          <button
            type="button"
            aria-label="Chọn tất cả"
            aria-pressed={isChecked}
            className={cn(
              "border-background flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border transition-colors",
              isChecked ? "bg-primary text-primary-foreground" : "bg-background text-transparent",
            )}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => table.toggleAllPageRowsSelected(!isAllSelected)}
          >
            {isAllSelected ? <Check className="size-3" /> : isSomeSelected ? <Minus className="size-3" /> : null}
          </button>
        </div>
      );
    },
    cell: ({ row }) => {
      const isSelected = row.getIsSelected();

      return (
        <div className="flex items-center justify-center">
          <button
            type="button"
            aria-label="Chọn dòng"
            aria-pressed={isSelected}
            className={cn(
              "border-background flex h-5 w-5 cursor-pointer items-center justify-center rounded-md border transition-colors",
              isSelected ? "bg-primary text-primary-foreground" : "bg-background text-transparent",
            )}
            onMouseDown={(event) => event.stopPropagation()}
            onClick={() => row.toggleSelected()}
          >
            {isSelected ? <Check className="size-3" /> : null}
          </button>
        </div>
      );
    },
    enableSorting: false,
    enableHiding: false,
  },

  // Tên
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Tên" />,
    cell: ({ row }) => (
      <div className="max-w-[300px] truncate">
        <TableCellViewer item={row.original} />
      </div>
    ),
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Tên" },
  },

  // Phone
  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Số điện thoại" />,
    cell: ({ row }) => <span className="font-mono">{row.original.phone}</span>,
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Số điện thoại" },
  },

  // Email
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => <span>{row.original.email}</span>,
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Email" },
  },

  // Mã đơn
  {
    accessorKey: "ordercode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mã đơn" />,
    cell: ({ row }) => <span className="font-mono text-sm">{row.original.ordercode}</span>,
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Mã đơn" },
  },

  // Brand
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

  // Danh mục
  {
    accessorKey: "category",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Danh mục" />,
    cell: ({ row }) => <span>{row.original.category}</span>,
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Danh mục" },
  },

  // Sản phẩm
  {
    accessorKey: "product",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Sản phẩm" />,
    cell: ({ row }) => <span>{row.original.product}</span>,
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Sản phẩm" },
  },

  // Giới tính
  {
    accessorKey: "gender",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Giới tính" />,
    cell: ({ row }) => <span>{formatGender(row.original.gender)}</span>,
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Giới tính" },
  },

  // Thời gian vote
  {
    accessorKey: "time_vote",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Thời gian" />,
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.time_vote
          ? row.original.time_vote instanceof Date
            ? row.original.time_vote.toLocaleDateString("vi-VN")
            : row.original.time_vote
          : ""}
      </span>
    ),
    enableSorting: false,
    enableHiding: true,
    meta: { label: "Thời gian" },
  },

  // Actions
  {
    id: "actions",
    cell: ({ row }) => <RowActionsCell row={row.original} onDeleteRow={onDeleteRow} />,
    enableSorting: false,
  },
];
