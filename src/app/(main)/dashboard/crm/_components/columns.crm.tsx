import { ColumnDef } from "@tanstack/react-table";
import { GripVertical } from "lucide-react";
import z from "zod";

import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";

import { ChannelSummarySchema } from "./schema";

const fmtNumber = (n: number) => n.toLocaleString("en-GB");

export const channelColumns: ColumnDef<z.infer<typeof ChannelSummarySchema>>[] = [
  {
    id: "drag",
    header: () => <div className="w-7" />,
    cell: () => (
      <Button variant="ghost" size="icon" className="text-muted-foreground size-7 cursor-grab hover:bg-transparent">
        <GripVertical className="text-muted-foreground size-4" />
      </Button>
    ),
    enableSorting: false,
    enableHiding: false,
    size: 40,
  },
  {
    accessorKey: "kenh_ban",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Hạng vé" />,
    cell: ({ row }) => (
      <div className="flex items-center gap-2">
        <span className="text-base font-semibold">{row.original.kenh_ban}</span>
      </div>
    ),
    enableHiding: false,
  },
  {
    accessorKey: "quantity",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vé đăng ký" />,
    cell: ({ row }) => (
      <div className="text-left">
        <span className="text-sm font-medium tabular-nums">{fmtNumber(row.original.quantity)}</span>
      </div>
    ),
  },
  {
    accessorKey: "paydone_count",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Vé hoàn thành" />,
    cell: ({ row }) => (
      <div className="text-left">
        <span className="text-sm font-medium tabular-nums">{fmtNumber(row.original.paydone_count)}</span>
      </div>
    ),
  },
  {
    accessorKey: "paydone_money",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Doanh thu" />,
    cell: ({ row }) => (
      <div className="text-left">
        <span className="text-sm font-semibold tabular-nums">{fmtNumber(row.original.paydone_money)} ₫</span>
      </div>
    ),
  },
  {
    accessorKey: "paydone_money_vat",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Doanh thu (VAT)" />,
    cell: ({ row }) => (
      <div className="text-left">
        <span className="text-base font-bold tabular-nums">{fmtNumber(row.original.paydone_money_vat)} ₫</span>
      </div>
    ),
    enableHiding: false,
  },
];
