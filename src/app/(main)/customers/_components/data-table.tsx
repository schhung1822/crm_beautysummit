"use client";

import * as React from "react";

import { Download, Search } from "lucide-react";
import { toast } from "sonner";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { toggleFilteredRows, withSelectionColumn } from "@/components/data-table/selection-toggle";
import { Button } from "@/components/ui/button";
import { ExportDialog, type DateRange, type ExportFormat } from "@/components/ui/export-dialog";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportData, filterDataByDateRange } from "@/lib/export-utils";
import { matchesSearchTerm } from "@/lib/search-utils";

import { dashboardColumns } from "./columns";
import type { Users } from "./schema";

export function DataTable({ data: initialData }: { data: Users[] }) {
  const [data, setData] = React.useState<Users[]>(() => initialData);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const filteredData = React.useMemo(() => {
    return data.filter((item) =>
      matchesSearchTerm(searchTerm, [item.name, item.customer_ID, item.phone, item.email, item.gender, item.career]),
    );
  }, [data, searchTerm]);

  const handleRowUpdated = React.useCallback((updated: Users) => {
    setData((prev) => prev.map((item) => (item.customer_ID === updated.customer_ID ? updated : item)));
  }, []);

  const handleDuplicateRow = React.useCallback(async (row: Users) => {
    const response = await fetch("/api/customers", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: "duplicate",
        customerId: row.customer_ID,
      }),
    });

    const result = (await response.json().catch(() => ({}))) as { data?: Users; message?: string };
    const duplicatedCustomer = result.data;
    if (!response.ok || !duplicatedCustomer) {
      throw new Error(result.message ?? "Khong the tao ban sao khach hang");
    }

    setData((prev) => [duplicatedCustomer, ...prev]);
    toast.success("Da tao ban sao khach hang");
  }, []);

  const handleDeleteRow = React.useCallback(async (row: Users) => {
    const response = await fetch("/api/customers", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        customerId: row.customer_ID,
      }),
    });

    const result = (await response.json().catch(() => ({}))) as { message?: string };
    if (!response.ok) {
      throw new Error(result.message ?? "Khong the xoa khach hang");
    }

    setData((prev) => prev.filter((item) => item.customer_ID !== row.customer_ID));
    toast.success("Da xoa khach hang");
  }, []);

  const columns = React.useMemo(
    () => withSelectionColumn(dashboardColumns(handleRowUpdated, handleDuplicateRow, handleDeleteRow)),
    [handleDeleteRow, handleDuplicateRow, handleRowUpdated],
  );

  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row, index) => row.customer_ID || row.phone || `customer-${index}`,
  });
  const selectedItems = table.getSelectedRowModel().rows.map((row) => row.original);

  const handleDeleteSelected = React.useCallback(async () => {
    if (!selectedItems.length) {
      toast.warning("Vui long chon khach hang can xoa");
      return;
    }

    if (!window.confirm(`Xoa ${selectedItems.length} khach hang da chon?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerIds: selectedItems.map((item) => item.customer_ID),
        }),
      });

      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message ?? "Khong the xoa khach hang");
      }

      const deletedIds = new Set(selectedItems.map((item) => item.customer_ID));
      setData((prev) => prev.filter((item) => !deletedIds.has(item.customer_ID)));
      table.resetRowSelection();
      toast.success(`Da xoa ${selectedItems.length} khach hang`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the xoa khach hang");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedItems, table]);

  const handleExport = React.useCallback(
    (format: ExportFormat, dateRange: DateRange) => {
      setIsExporting(true);

      try {
        let dataToExport = filteredData;

        if (dateRange.from || dateRange.to) {
          dataToExport = filterDataByDateRange(filteredData, "create_time", dateRange);
        }

        const headers = {
          customer_ID: "Ma khach hang",
          name: "Ten khach hang",
          phone: "So dien thoai",
          email: "Email",
          gender: "Gioi tinh",
          career: "Nghe nghiep",
          create_time: "Ngay tao",
          user_ip: "User IP",
          user_agent: "User Agent",
          fbp: "FBP",
          fbc: "FBC",
        };

        const dateStr = new Date().toISOString().split("T")[0];
        const filename = `customers_${dateStr}`;

        exportData({
          format,
          data: dataToExport,
          headers,
          filename,
        });

        toast.success(`Xuất ${dataToExport.length} khách hàng thành công`);
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
            placeholder="Tìm theo tên, mã, SĐT, email, giới tính, nghề nghiệp..."
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
              {isDeleting ? "Đang xóa..." : `Xóa (${selectedItems.length})`}
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

      <div className="nice-scroll overflow-hidden rounded-lg">
        <DataTableNew table={table} columns={columns} />
      </div>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        isExporting={isExporting}
        title="Xuất dữ liệu khách hàng"
        description="Chọn định dạng và khoảng thời gian để xuất dữ liệu khách hàng"
      />
    </div>
  );
}
