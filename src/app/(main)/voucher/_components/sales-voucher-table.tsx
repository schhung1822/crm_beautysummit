"use client";

import { Pencil, Trash2 } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import type { SalesVoucherRecord } from "@/lib/sales-vouchers";

import {
  formatDateLabel,
  formatNumber,
  getClassyLabel,
  getVoucherValueLabel,
  isVoucherActive,
} from "./sales-voucher-manager.utils";

type SalesVoucherTableProps = {
  data: SalesVoucherRecord[];
  deletingId: number | null;
  onEdit: (item: SalesVoucherRecord) => void;
  onDelete: (item: SalesVoucherRecord) => void;
};

export function SalesVoucherTable({ data, deletingId, onEdit, onDelete }: SalesVoucherTableProps) {
  return (
    <div className="bg-card overflow-hidden rounded-xl border shadow-sm">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px] px-4">Voucher</TableHead>
            <TableHead className="w-[150px]">Kiểu</TableHead>
            <TableHead className="w-[140px]">Giá trị</TableHead>
            <TableHead className="w-[120px]">Số lượng</TableHead>
            <TableHead className="w-[140px]">Hạng vé</TableHead>
            <TableHead className="w-[220px]">Thời gian</TableHead>
            <TableHead className="w-[120px]">Trạng thái</TableHead>
            <TableHead className="w-[120px] text-right">Thao tác</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {data.length === 0 ? (
            <TableRow>
              <TableCell colSpan={8} className="text-muted-foreground h-28 text-center">
                Chưa có voucher phù hợp.
              </TableCell>
            </TableRow>
          ) : (
            data.map((item) => {
              const active = isVoucherActive(item);
              return (
                <TableRow key={item.id}>
                  <TableCell className="px-4">
                    <div className="font-medium">{item.voucher}</div>
                    <div className="text-muted-foreground mt-1 text-xs">ID #{item.id}</div>
                  </TableCell>
                  <TableCell>{getClassyLabel(item.classy)}</TableCell>
                  <TableCell>{getVoucherValueLabel(item)}</TableCell>
                  <TableCell>{formatNumber(item.number)}</TableCell>
                  <TableCell>{item.voucherClass ?? "Tất cả"}</TableCell>
                  <TableCell className="text-muted-foreground text-xs">
                    {formatDateLabel(item.fromDate)} - {formatDateLabel(item.toDate)}
                  </TableCell>
                  <TableCell>
                    <Badge variant={active ? "secondary" : "outline"}>{active ? "Đang hiệu lực" : "Hết hạn"}</Badge>
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-2">
                      <Button size="icon" variant="outline" onClick={() => onEdit(item)}>
                        <Pencil className="size-4" />
                        <span className="sr-only">Sửa voucher</span>
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        onClick={() => onDelete(item)}
                        disabled={deletingId === item.id}
                      >
                        <Trash2 className="size-4" />
                        <span className="sr-only">Xóa voucher</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              );
            })
          )}
        </TableBody>
      </Table>
    </div>
  );
}
