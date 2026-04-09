"use client";

import * as React from "react";

import { Download, Search } from "lucide-react";
import { toast } from "sonner";

import { DataTable as DataTableNew } from "@/components/data-table/data-table";
import { DataTableViewOptions } from "@/components/data-table/data-table-view-options";
import { withDndColumn } from "@/components/data-table/table-utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ExportDialog, type DateRange, type ExportFormat } from "@/components/ui/export-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportData } from "@/lib/export-utils";
import type { VoteOptionRecord } from "@/lib/vote-options";

import { dashboardColumns } from "./columns";
import { EventsSummary } from "./events-summary";
import { Academy } from "./schema";
import { VoteOptionManager } from "./vote-option-manager";

const colorPalette = ["#22c55e", "#3b82f6", "#f59e0b", "#a855f7", "#ec4899", "#14b8a6", "#f97316"];

function toVoteRowKey(row: Pick<Academy, "ordercode" | "phone" | "brand_id" | "time_vote">) {
  return `${row.ordercode}__${row.phone}__${row.brand_id}__${row.time_vote ? new Date(row.time_vote).toISOString() : ""}`;
}

export function DataTable({
  data: initialData,
  initialVoteOptions,
}: {
  data: Academy[];
  initialVoteOptions: VoteOptionRecord[];
}) {
  const [data, setData] = React.useState<Academy[]>(() => initialData);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedBrand, setSelectedBrand] = React.useState<string>("all");
  const [renderKey, setRenderKey] = React.useState(0);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const brandNames = React.useMemo(() => {
    const names = new Set(data.map((item) => item.brand_name).filter(Boolean));
    return Array.from(names).sort();
  }, [data]);

  const filteredData = React.useMemo(() => {
    let filtered = data;

    if (selectedBrand !== "all") {
      filtered = filtered.filter((item) => item.brand_name === selectedBrand);
    }

    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(term) ||
          item.phone.toLowerCase().includes(term) ||
          item.email.toLowerCase().includes(term) ||
          item.ordercode.toLowerCase().includes(term) ||
          item.brand_name.toLowerCase().includes(term),
      );
    }

    return filtered;
  }, [data, searchTerm, selectedBrand]);

  const totalVotes = filteredData.length;

  const summaryDataFactory = React.useCallback(
    (getter: (item: Academy) => string) => {
      const counts = new Map<string, number>();
      filteredData.forEach((item) => {
        const key = (getter(item) || "Không rõ").trim() || "Không rõ";
        counts.set(key, (counts.get(key) ?? 0) + 1);
      });

      const rows = Array.from(counts.entries())
        .map(([name, value]) => ({ name, value }))
        .sort((a, b) => b.value - a.value);

      const top = rows.slice(0, 6);
      const rest = rows.slice(6).reduce((acc, cur) => acc + cur.value, 0);
      if (rest > 0) top.push({ name: "Khác", value: rest });

      return top.map((item, index) => ({
        ...item,
        fill: colorPalette[index % colorPalette.length],
      }));
    },
    [filteredData],
  );

  const genderData = React.useMemo(() => summaryDataFactory((item) => item.gender), [summaryDataFactory]);
  const brandRatioData = React.useMemo(() => summaryDataFactory((item) => item.brand_name), [summaryDataFactory]);

  const handleDeleteRow = React.useCallback(async (row: Academy) => {
    try {
      const records = [
        {
          ordercode: row.ordercode,
          phone: row.phone,
          brand_id: row.brand_id,
          time_vote: row.time_vote,
        },
      ];

      const response = await fetch("/api/votes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error ?? "Không thể xóa bản ghi");
      }

      const deletedSet = new Set(records.map((record) => toVoteRowKey(record)));
      setData((prev) => prev.filter((item) => !deletedSet.has(toVoteRowKey(item))));
      toast.success("Đã xóa bản ghi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra khi xóa dữ liệu");
    }
  }, []);

  const columns = withDndColumn(dashboardColumns(handleDeleteRow));
  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row) => toVoteRowKey(row),
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
      const records = selectedItems.map((item) => ({
        ordercode: item.ordercode,
        phone: item.phone,
        brand_id: item.brand_id,
        time_vote: item.time_vote,
      }));

      const response = await fetch("/api/votes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ records }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error ?? "Không thể xóa bản ghi đã chọn");
      }

      const selectedSet = new Set(records.map((record) => toVoteRowKey(record)));
      setData((prev) => prev.filter((item) => !selectedSet.has(toVoteRowKey(item))));
      table.resetRowSelection();
      toast.success(`Đã xóa ${records.length} bản ghi`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra khi xóa dữ liệu");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedItems, table]);

  React.useEffect(() => {
    table.resetRowSelection();
    table.setPageIndex(0);
    setRenderKey((prev) => prev + 1);
  }, [searchTerm, selectedBrand, table]);

  const handleExport = React.useCallback(
    (format: ExportFormat, dateRange: DateRange) => {
      setIsExporting(true);
      void dateRange;

      try {
        const headers = {
          ordercode: "Mã đơn",
          name: "Tên",
          phone: "Số điện thoại",
          email: "Email",
          gender: "Giới tính",
          time_vote: "Thời gian vote",
          brand_id: "Mã thương hiệu",
          brand_name: "Thương hiệu",
          category: "Danh mục",
          product: "Sản phẩm",
          voted: "Vote",
          link: "Link",
        };

        const brandName = selectedBrand !== "all" ? `_${selectedBrand}` : "";
        const dateStr = new Date().toISOString().split("T")[0];

        exportData({
          format,
          data: filteredData,
          headers,
          filename: `events${brandName}_${dateStr}`,
        });

        toast.success(`Xuất ${filteredData.length} bản ghi thành công!`);
        setExportDialogOpen(false);
      } catch (error) {
        console.error("Export error:", error);
        toast.error("Có lỗi xảy ra khi xuất dữ liệu");
      } finally {
        setIsExporting(false);
      }
    },
    [filteredData, selectedBrand],
  );

  return (
    <div className="flex w-full flex-col gap-6">
      <VoteOptionManager initialData={initialVoteOptions} />

      <EventsSummary totalVotes={totalVotes} genderData={genderData} brandRatioData={brandRatioData} />

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Tìm kiếm theo tên, SĐT, email..."
              className="pl-10"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <Select value={selectedBrand} onValueChange={setSelectedBrand}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="Chọn thương hiệu" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tất cả thương hiệu</SelectItem>
              {brandNames.map((brandName) => (
                <SelectItem key={brandName} value={brandName}>
                  {brandName}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {(selectedBrand !== "all" || searchTerm) && (
            <Badge variant="secondary" className="ml-2">
              {filteredData.length} / {data.length} kết quả
            </Badge>
          )}
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

      <div className="nice-scroll overflow-hidden rounded-lg" key={renderKey}>
        <DataTableNew dndEnabled table={table} columns={columns} onReorder={setData} />
      </div>

      <ExportDialog
        open={exportDialogOpen}
        onOpenChange={setExportDialogOpen}
        onExport={handleExport}
        isExporting={isExporting}
        title="Xuất dữ liệu sự kiện"
        description="Chọn định dạng và khoảng thời gian để xuất dữ liệu sự kiện"
      />
    </div>
  );
}
