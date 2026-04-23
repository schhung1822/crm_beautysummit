import { ColumnDef } from "@tanstack/react-table";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import {
  SelectionToggle,
  getFilteredSelectionState,
  toggleFilteredRows,
} from "@/components/data-table/selection-toggle";
import { Badge } from "@/components/ui/badge";

import { RowActionsCell } from "./row-actions-cell";
import { Channel } from "./schema";
import { TableCellViewer } from "./table-cell-viewer";

type OnRowUpdated = (updated: Channel, originalOrderCode: string) => void;
type OnDeleteRow = (row: Channel) => Promise<void> | void;

function formatGender(value?: string | null) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return "Khác";
  if (v === "f" || v === "female" || v === "nữ" || v === "nu") return "Nữ";
  if (v === "m" || v === "male" || v === "nam") return "Nam";
  return "Khác";
}

function hasAnyKeyword(source: string, keywords: string[]) {
  return keywords.some((keyword) => source.includes(keyword));
}

function getTicketClassBadge(value?: string | null) {
  const v = String(value ?? "")
    .trim()
    .toLowerCase();

  if (!v) return "bg-muted/20 text-muted-foreground";

  const rules = [
    { keywords: ["vip", "v.i.p"], className: "bg-fuchsia-600 text-white" },
    { keywords: ["ruby", "pre"], className: "bg-rose-600 text-white" },
    { keywords: ["gold", "vàng"], className: "bg-amber-500 text-black" },
    { keywords: ["silver", "bạc"], className: "bg-slate-400 text-white" },
    { keywords: ["platinum", "bạch kim"], className: "bg-indigo-600 text-white" },
    { keywords: ["std", "thường"], className: "bg-amber-500 text-black" },
  ];

  const matched = rules.find((rule) => hasAnyKeyword(v, rule.keywords));
  if (matched) return matched.className;

  return "bg-blue-600 text-white";
}

function getPaymentStatusBadgeClass(status: string) {
  const s = String(status).toLowerCase();

  const rules = [
    {
      exact: ["paydone", "paid"],
      includes: ["hoàn thành", "thành công", "đã thanh toán"],
      className: "bg-green-600 text-white",
    },
    {
      exact: ["new"],
      includes: [],
      className: "bg-yellow-500 text-black",
    },
    {
      exact: ["cancel", "cancelled", "failed"],
      includes: ["hủy", "không", "thất bại"],
      className: "bg-red-600 text-white",
    },
    {
      exact: ["refunded"],
      includes: ["vé tặng"],
      className: "bg-indigo-600 text-white",
    },
  ];

  const matched = rules.find((rule) => rule.exact.includes(s) || hasAnyKeyword(s, rule.includes));
  return matched?.className ?? "bg-muted/20 text-muted-foreground";
}

// ---- Columns factory ----
export const dashboardColumns = (onRowUpdated?: OnRowUpdated, onDeleteRow?: OnDeleteRow): ColumnDef<Channel>[] => [
  {
    id: "select",
    header: ({ table }) => {
      const selectionState = getFilteredSelectionState(table);

      return (
        <div className="flex items-center justify-center border-b-zinc-400">
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
    cell: ({ row }) => <TableCellViewer item={row.original} onRowUpdated={onRowUpdated} />,
    enableSorting: false,
    size: 120,
  },

  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Họ tên" />,
    cell: ({ row }) => <span className="font-mono">{row.original.name}</span>,
    enableSorting: false,
    size: 160,
  },

  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Điện thoại" />,
    cell: ({ row }) => <span className="font-mono">{row.original.phone}</span>,
    enableSorting: false,
    size: 120,
  },

  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => <span className="block max-w-[180px] truncate">{row.original.email}</span>,
    enableSorting: false,
    size: 180,
  },

  {
    accessorKey: "class",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Hạng vé" />,
    cell: ({ row }) => (
      <Badge className={`rounded-full px-2.5 py-0.5 text-xs ${getTicketClassBadge(row.original.class)}`}>
        {row.original.class || "—"}
      </Badge>
    ),
    enableSorting: false,
    size: 100,
  },

  {
    accessorKey: "gender",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Giới tính" />,
    cell: ({ row }) => <span>{formatGender(row.original.gender)}</span>,
    enableSorting: false,
    size: 90,
  },

  {
    accessorKey: "career",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Nghề nghiệp" />,
    cell: ({ row }) => <span>{row.original.career}</span>,
    enableSorting: false,
    size: 140,
  },

  {
    accessorKey: "money",
    header: ({ column }) => <DataTableColumnHeader className="w-full text-right" column={column} title="Thành tiền" />,
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{(row.original.money || 0).toLocaleString("en-GB")}</div>
    ),
    enableSorting: false,
    size: 110,
  },

  {
    accessorKey: "money_VAT",
    header: ({ column }) => (
      <DataTableColumnHeader className="w-full text-right" column={column} title="Thành tiền (VAT)" />
    ),
    cell: ({ row }) => (
      <div className="text-right tabular-nums">{(row.original.money_VAT || 0).toLocaleString("en-GB")}</div>
    ),
    enableSorting: false,
    size: 120,
  },

  {
    accessorKey: "status",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái" />,
    cell: ({ row }) => {
      const className = getPaymentStatusBadgeClass(row.original.status);

      return <Badge className={`rounded-full px-2.5 py-0.5 text-xs ${className}`}>{row.original.status || "—"}</Badge>;
    },
    enableSorting: false,
    size: 130,
  },

  {
    accessorKey: "update_time",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ngày thanh toán" />,
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.update_time
          ? row.original.update_time instanceof Date
            ? row.original.update_time.toLocaleDateString("en-GB")
            : row.original.update_time
          : ""}
      </span>
    ),
    enableSorting: false,
    size: 110,
  },

  {
    accessorKey: "status_checkin",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Check-in" />,
    cell: ({ row }) => <Badge variant="secondary">{row.original.status_checkin}</Badge>,
    enableSorting: false,
    size: 110,
  },

  {
    accessorKey: "checkin_time",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Ngày check-in" />,
    cell: ({ row }) => (
      <span className="text-sm">
        {row.original.checkin_time
          ? row.original.checkin_time instanceof Date
            ? row.original.checkin_time.toLocaleDateString("en-GB")
            : row.original.checkin_time
          : ""}
      </span>
    ),
    enableSorting: false,
    size: 120,
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
    size: 110,
  },

  // Actions
  {
    id: "actions",
    cell: ({ row }) => <RowActionsCell row={row.original} onRowUpdated={onRowUpdated} onDeleteRow={onDeleteRow} />,
    enableSorting: false,
    size: 60,
  },
];
