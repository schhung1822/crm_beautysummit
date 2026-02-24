"use client";

import * as React from "react";

import { Download, Search } from "lucide-react";
import { toast } from "sonner";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { withDndColumn } from "@/components/data-table/table-utils";
import { Button } from "@/components/ui/button";
import { ExportDialog, type DateRange, type ExportFormat } from "@/components/ui/export-dialog";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportData, filterDataByDateRange } from "@/lib/export-utils";

import { dashboardColumns as makeColumns, type Stats } from "./columns";
import type { Channel } from "./schema";

function toOrderRowKey(item: Pick<Channel, "orderCode" | "phone" | "create_at">) {
  return `${item.orderCode || item.phone || ""}-${item.create_at?.toString() ?? ""}`;
}

export function DataTable({ data: initialData = [] }: { data?: Channel[] }) {
  const [data, setData] = React.useState<Channel[]>(() => initialData);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const stats: Stats = React.useMemo(
    () => ({
      totalOrders: initialData.length,
      totalMoney: initialData.reduce((sum, item) => sum + Number(item.money), 0),
      totalMoneyVAT: initialData.reduce((sum, item) => sum + Number(item.money_VAT), 0),
    }),
    [initialData],
  );

  const handleRowUpdated = React.useCallback((updated: Channel, originalOrderCode: string) => {
    setData((prev) => prev.map((item) => (item.orderCode === originalOrderCode ? updated : item)));
  }, []);

  const handleDeleteRow = React.useCallback(async (row: Channel) => {
    try {
      if (!row.orderCode) {
        throw new Error("Bản ghi không có mã đơn để xóa");
      }

      const response = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCodes: [row.orderCode] }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error ?? "Không thể xóa bản ghi");
      }

      setData((prev) => prev.filter((item) => item.orderCode !== row.orderCode));
      toast.success("Đã xóa bản ghi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa bản ghi");
    }
  }, []);

  const columns = React.useMemo(
    () => withDndColumn(makeColumns(stats, handleRowUpdated, handleDeleteRow)),
    [handleDeleteRow, handleRowUpdated, stats],
  );

  const filteredData = React.useMemo(() => {
    if (!searchTerm.trim()) return data;

    const term = searchTerm.toLowerCase();
    return data.filter(
      (item) =>
        String(item.orderCode).toLowerCase().includes(term) ||
        String(item.name).toLowerCase().includes(term) ||
        String(item.phone).toLowerCase().includes(term) ||
        String(item.email).toLowerCase().includes(term) ||
        String(item.class).toLowerCase().includes(term),
    );
  }, [data, searchTerm]);

  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row) => toOrderRowKey(row),
  });

  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selectedItems = selectedRows.map((row) => row.original);

  const handleDeleteSelected = React.useCallback(async () => {
    if (!selectedItems.length) {
      toast.warning("Vui lòng chọn bản ghi cần xóa");
      return;
    }

    setIsDeleting(true);
    try {
      const orderCodes = selectedItems.map((item) => item.orderCode).filter((value): value is string => Boolean(value));

      const response = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCodes }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error ?? "Không thể xóa bản ghi đã chọn");
      }

      const selectedSet = new Set(orderCodes);
      setData((prev) => prev.filter((item) => !selectedSet.has(item.orderCode)));
      table.resetRowSelection();
      toast.success(`Đã xóa ${orderCodes.length} bản ghi`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra khi xóa dữ liệu");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedItems, table]);

  const handleExport = React.useCallback(
    (format: ExportFormat, dateRange: DateRange) => {
      setIsExporting(true);

      try {
        const dataToExport =
          dateRange.from || dateRange.to ? filterDataByDateRange(filteredData, "create_at", dateRange) : filteredData;

        exportData({
          format,
          data: dataToExport,
          headers: {
            orderCode: "Mã đơn",
            name: "Họ tên",
            phone: "Số điện thoại",
            email: "Email",
            class: "Lớp",
            money: "Tiền",
            money_VAT: "Tiền (VAT)",
            trang_thai_thanh_toan: "Trạng thái thanh toán",
            update_time: "Cập nhật",
            create_at: "Ngày tạo",
            gender: "Giới tính",
            career: "Nghề nghiệp",
            status_checkin: "Trạng thái check-in",
            date_checkin: "Ngày check-in",
          },
          filename: `orders_${new Date().toISOString().split("T")[0]}`,
        });

        toast.success(`Xuất ${dataToExport.length} đơn hàng thành công!`);
        setExportDialogOpen(false);
      } catch (error) {
        console.error("Export error:", error);
        toast.error("Có lỗi xảy ra khi xuất dữ liệu");
      } finally {
        setIsExporting(false);
      }
    },
    [filteredData],
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <div className="relative max-w-sm flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input
            placeholder="Tìm kiếm theo mã, tên, SĐT, email, lớp..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="destructive"
            onClick={handleDeleteSelected}
            disabled={selectedItems.length === 0 || isDeleting}
          >
            {isDeleting ? "Đang xóa..." : `Xóa đã chọn (${selectedItems.length})`}
          </Button>
          <DataTableViewOptions table={table} />
          <Button
            variant="outline"
            size="sm"
            onClick={() => setExportDialogOpen(true)}
            disabled={filteredData.length === 0}
          >
            <Download className="size-4" />
            <span className="hidden lg:inline">Xuất</span>
          </Button>
        </div>
      </div>

      <div className="nice-scroll overflow-x-auto rounded-lg">
        <DataTableNew dndEnabled table={table} columns={columns} onReorder={setData} />
      </div>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        isExporting={isExporting}
        title="Xuất dữ liệu đơn hàng"
        description="Chọn định dạng và khoảng thời gian để xuất dữ liệu đơn hàng"
      />
    </div>
  );
}
