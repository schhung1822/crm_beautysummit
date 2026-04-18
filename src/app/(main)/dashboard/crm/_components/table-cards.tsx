"use client";

import { DataTable } from "@/components/data-table/data-table";
import { Card, CardHeader, CardTitle, CardContent, CardAction } from "@/components/ui/card";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";

import { channelColumns } from "./columns.crm";
import { ChannelSummary } from "./schema";

type Props = {
  channels: ChannelSummary[];
};

export function TableCards({ channels }: Props) {
  const formatVND = (n: number) => n.toLocaleString("en-GB");
  const total = channels.reduce(
    (acc, cur) => {
      acc.all_count += cur.quantity;
      acc.paydone_count += cur.paydone_count;
      acc.paydone_money += cur.paydone_money;
      acc.paydone_money_vat += cur.paydone_money_vat;
      return acc;
    },
    { all_count: 0, paydone_count: 0, paydone_money: 0, paydone_money_vat: 0 },
  );

  const table = useDataTableInstance({
    data: channels,
    columns: channelColumns,
    getRowId: (row) => row.kenh_ban,
  });

  return (
    <Card className="shadow-sm p-1">
      <CardHeader className="bg-muted/30 border-b">
        <CardTitle className="text-lg">Thống kê doanh thu theo hạng vé</CardTitle>
        <CardAction>
          <div className="flex items-center gap-2"></div>
        </CardAction>
      </CardHeader>
      <CardContent className="">
        <div className="bg-muted/20 mb-6 grid grid-cols-2 gap-4 rounded-lg border p-4 sm:grid-cols-3 lg:grid-cols-5">
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs font-medium">Vé đăng ký</div>
            <div className="text-2xl font-bold tabular-nums">{formatVND(total.all_count)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs font-medium">Vé hoàn thành</div>
            <div className="text-2xl font-bold tabular-nums">{formatVND(total.paydone_count)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs font-medium">Doanh thu</div>
            <div className="text-2xl font-bold tabular-nums">{formatVND(total.paydone_money)}</div>
          </div>
          <div className="space-y-1">
            <div className="text-muted-foreground text-xs font-medium">Doanh thu (VAT)</div>
            <div className="text-2xl font-bold tabular-nums">{formatVND(total.paydone_money_vat)}</div>
          </div>
        </div>
        <div className="overflow-hidden rounded-lg">
          <DataTable table={table} columns={channelColumns} />
        </div>
      </CardContent>
    </Card>
  );
}
