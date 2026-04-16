"use client";

import * as React from "react";

import { Download, Search } from "lucide-react";
import { toast } from "sonner";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { toggleFilteredRows } from "@/components/data-table/selection-toggle";
import { Button } from "@/components/ui/button";
import { ExportDialog, type ExportFormat, type DateRange } from "@/components/ui/export-dialog";
import { Input } from "@/components/ui/input";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportData } from "@/lib/export-utils";
import { matchesSearchTerm } from "@/lib/search-utils";

import { dashboardColumns } from "./columns";
import { UsersOA } from "./schema";

export function DataTable({ data: initialData }: { data: UsersOA[] }) {
  const [data, setData] = React.useState<UsersOA[]>(() => initialData);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const filteredData = React.useMemo(() => {
    return data.filter((item) =>
      matchesSearchTerm(searchTerm, [item.alias, item.user_id, item.phone, item.city, item.district]),
    );
  }, [data, searchTerm]);

  const columns = dashboardColumns;
  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row, index) => row.user_id || row.phone || row.alias || `oa-${index}`,
  });
  const selectedItems = table.getSelectedRowModel().rows.map((row) => row.original);

  const handleDeleteSelected = React.useCallback(async () => {
    if (!selectedItems.length) {
      toast.warning("Vui long chon tai khoan OA can xoa");
      return;
    }

    if (!window.confirm(`Xoa ${selectedItems.length} tai khoan OA da chon?`)) {
      return;
    }

    setIsDeleting(true);
    try {
      const response = await fetch("/api/zalo-oa", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userIds: selectedItems.map((item) => item.user_id) }),
      });

      const result = (await response.json().catch(() => ({}))) as { message?: string };
      if (!response.ok) {
        throw new Error(result.message ?? "Khong the xoa tai khoan OA");
      }

      const deletedIds = new Set(selectedItems.map((item) => item.user_id));
      setData((previous) => previous.filter((item) => !deletedIds.has(item.user_id)));
      table.resetRowSelection();
      toast.success(`Da xoa ${selectedItems.length} tai khoan OA`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the xoa tai khoan OA");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedItems, table]);

  const handleExport = React.useCallback(
    (format: ExportFormat, _dateRange: DateRange) => {
      setIsExporting(true);
      void _dateRange;

      try {
        const dataToExport = filteredData;

        const headers = {
          user_id: "Mã người dùng",
          alias: "Tên hiển thị",
          follower: "Theo dõi",
          is_sensitive: "Nhạy cảm",
          avatar: "Ảnh đại diện",
          phone: "Số điện thoại",
          city: "Thành phố",
          address: "Địa chỉ",
          district: "Quận/Huyện",
        };

        const dateStr = new Date().toISOString().split("T")[0];
        const filename = `zalo_oa_${dateStr}`;

        exportData({
          format,
          data: dataToExport,
          headers,
          filename,
        });

        toast.success(`Xuất ${dataToExport.length} người dùng thành công!`);
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
            placeholder="Tìm kiếm theo tên, mã, SĐT, người tạo..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
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
