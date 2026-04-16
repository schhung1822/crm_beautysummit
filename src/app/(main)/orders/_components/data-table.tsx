"use client";

import * as React from "react";

import { Download, Search } from "lucide-react";
import { toast } from "sonner";

import { DataTable as SharedDataTable } from "@/components/data-table/data-table";
import { toggleFilteredRows, withSelectionColumn } from "@/components/data-table/selection-toggle";
import { Button } from "@/components/ui/button";
import { ExportDialog, type DateRange, type ExportFormat } from "@/components/ui/export-dialog";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportData, filterDataByDateRange } from "@/lib/export-utils";
import { matchesSearchTerm } from "@/lib/search-utils";

import { dashboardColumns as makeColumns } from "./columns";
import type { Channel } from "./schema";

function toOrderRowKey(item: Pick<Channel, "ordercode" | "phone" | "create_time">) {
  return `${item.ordercode || item.phone || ""}-${item.create_time?.toString() ?? ""}`;
}

function OrdersDataTable({ data: initialData = [] }: { data?: Channel[] }) {
  const [data, setData] = React.useState<Channel[]>(() => initialData);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  React.useEffect(() => {
    setData(initialData);
  }, [initialData]);

  const handleRowUpdated = React.useCallback((updated: Channel, originalOrderCode: string) => {
    setData((previous) => previous.map((item) => (item.ordercode === originalOrderCode ? updated : item)));
  }, []);

  const handleDeleteRow = React.useCallback(async (row: Channel) => {
    try {
      if (!row.ordercode) {
        throw new Error("Bản ghi không có mã đơn để xóa");
      }

      const response = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCodes: [row.ordercode] }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error ?? "Không thể xóa bản ghi");
      }

      setData((previous) => previous.filter((item) => item.ordercode !== row.ordercode));
      toast.success("Đã xóa bản ghi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa bản ghi");
    }
  }, []);

  const columns = React.useMemo(
    () => withSelectionColumn(makeColumns(handleRowUpdated, handleDeleteRow)),
    [handleDeleteRow, handleRowUpdated],
  );

  const filteredData = React.useMemo(
    () =>
      data.filter((item) =>
        matchesSearchTerm(searchTerm, [item.ordercode, item.name, item.phone, item.email, item.class]),
      ),
    [data, searchTerm],
  );

  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row) => toOrderRowKey(row),
  });
  const selectedItems = table.getSelectedRowModel().rows.map((row) => row.original);

  const handleDeleteSelected = React.useCallback(async () => {
    if (!selectedItems.length) {
      toast.warning("Vui long chon don hang can xoa");
      return;
    }

    if (!window.confirm(`Xoa ${selectedItems.length} don hang da chon?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const orderCodes = selectedItems.map((item) => item.ordercode).filter((value): value is string => Boolean(value));

      const response = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCodes }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error ?? "Khong the xoa don hang");
      }

      const deletedSet = new Set(orderCodes);
      setData((previous) => previous.filter((item) => !deletedSet.has(item.ordercode)));
      table.resetRowSelection();
      toast.success(`Da xoa ${orderCodes.length} don hang`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the xoa don hang");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedItems, table]);

  const handleExport = React.useCallback(
    (format: ExportFormat, dateRange: DateRange) => {
      setIsExporting(true);

      try {
        const dataToExport =
          dateRange.from || dateRange.to ? filterDataByDateRange(filteredData, "create_time", dateRange) : filteredData;

        exportData({
          format,
          data: dataToExport,
          headers: {
            ordercode: "Mã đơn",
            name: "Họ tên",
            phone: "Số điện thoại",
            email: "Email",
            class: "Hạng vé",
            money: "Tiền",
            money_VAT: "Thành tiền",
            status: "Trạng thái thanh toán",
            update_time: "Cập nhật",
            create_time: "Ngày tạo",
            gender: "Giới tính",
            career: "Nghề nghiệp",
            status_checkin: "Trạng thái check-in",
            checkin_time: "Ngày check-in",
          },
          filename: `orders_${new Date().toISOString().split("T")[0]}`,
        });

        toast.success(`Xuất ${dataToExport.length} đơn hàng thành công`);
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
            placeholder="Tìm kiếm theo mã, tên, SĐT, email, hạng vé..."
            className="pl-10"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={() => toggleFilteredRows(table, true)}>
            Chọn tất cả
          </Button>
          <Button size="sm" variant="outline" onClick={() => toggleFilteredRows(table, false)}>
            Bỏ chọn tất cả
          </Button>
          {selectedItems.length > 0 ? (
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected} disabled={isDeleting}>
              {isDeleting ? "Dang xoa..." : `Xoa (${selectedItems.length})`}
            </Button>
          ) : null}

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
        <SharedDataTable table={table} columns={columns} />
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

export default OrdersDataTable;
