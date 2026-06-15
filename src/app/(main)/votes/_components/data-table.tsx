"use client";

import * as React from "react";

import { Download, Search } from "lucide-react";
import { toast } from "sonner";

import { DataTable as SharedDataTable } from "@/components/data-table/data-table";
import { withSelectionColumn } from "@/components/data-table/selection-toggle";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
import { ExportDialog, type DateRange, type ExportFormat } from "@/components/ui/export-dialog";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { exportData } from "@/lib/export-utils";
import { matchesSearchTerm } from "@/lib/search-utils";
import type { VoteOptionRecord } from "@/lib/vote-options";

import { dashboardColumns } from "./columns";
import { EventsSummary } from "./events-summary";
import { Academy } from "./schema";

function toVoteRowKey(row: Pick<Academy, "ordercode" | "phone" | "brand_id" | "time_vote">) {
  return `${row.ordercode}__${row.phone}__${row.brand_id}__${row.time_vote ? new Date(row.time_vote).toISOString() : ""}`;
}

function normalizeCategory(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .replace(/[^\w\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toLowerCase();
}

const CATEGORY_RANKING_TARGETS = [
  { title: "Gian hàng yêu thích", normalized: normalizeCategory("Gian hàng yêu thích") },
  { title: "Sản phẩm, công nghệ ấn tượng", normalized: normalizeCategory("Sản phẩm, công nghệ ấn tượng") },
] as const;

export function DataTable({
  data: initialData,
  initialVoteOptions,
  eventDay1,
}: {
  data: Academy[];
  initialVoteOptions: VoteOptionRecord[];
  eventDay1: string;
}) {
  const [data, setData] = React.useState<Academy[]>(() => initialData);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [selectedBrand, setSelectedBrand] = React.useState<string>("all");
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [pendingEventDay1, setPendingEventDay1] = React.useState(eventDay1);

  const brandNames = React.useMemo(() => {
    const names = new Set(data.map((item) => item.brand_name).filter(Boolean));
    return Array.from(names).sort();
  }, [data]);

  const filteredData = React.useMemo(() => {
    let nextData = data;

    if (selectedBrand !== "all") {
      nextData = nextData.filter((item) => item.brand_name === selectedBrand);
    }

    if (searchTerm.trim()) {
      nextData = nextData.filter((item) =>
        matchesSearchTerm(searchTerm, [item.name, item.phone, item.email, item.ordercode, item.brand_name]),
      );
    }

    return nextData;
  }, [data, searchTerm, selectedBrand]);

  const categoryRankings = React.useMemo(
    () =>
      CATEGORY_RANKING_TARGETS.map((target) => {
        const counts = new Map<string, number>();

        initialVoteOptions
          .filter((option) => normalizeCategory(option.category) === target.normalized)
          .forEach((option) => {
            const name = (option.product || option.brandId || "Không rõ").trim();
            counts.set(name, counts.get(name) ?? 0);
          });

        data
          .filter((item) => normalizeCategory(item.category) === target.normalized)
          .forEach((item) => {
            const name = (item.product || item.brand_name || item.brand_id || "Không rõ").trim();
            counts.set(name, (counts.get(name) ?? 0) + 1);
          });

        return {
          title: target.title,
          items: Array.from(counts.entries())
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value || a.name.localeCompare(b.name)),
        };
      }),
    [data, initialVoteOptions],
  );

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
      setData((previous) => previous.filter((item) => !deletedSet.has(toVoteRowKey(item))));
      toast.success("Đã xóa bản ghi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra khi xóa dữ liệu");
    }
  }, []);

  const columns = React.useMemo(
    () => withSelectionColumn(dashboardColumns(handleDeleteRow, initialVoteOptions)),
    [handleDeleteRow, initialVoteOptions],
  );
  const table = useDataTableInstance({
    data: filteredData,
    columns,
    getRowId: (row) => toVoteRowKey(row),
  });
  const selectedItems = table.getSelectedRowModel().rows.map((row) => row.original);

  React.useEffect(() => {
    table.setPageIndex(0);
  }, [searchTerm, selectedBrand, table]);

  const handleDeleteSelected = React.useCallback(async () => {
    if (!selectedItems.length) {
      toast.warning("Vui lòng chọn vote cần xóa");
      return;
    }

    if (!window.confirm(`Xóa ${selectedItems.length} bản ghi vote đã chọn?`)) {
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
        throw new Error(result?.error ?? "Không thể xóa vote");
      }

      const deletedSet = new Set(records.map((record) => toVoteRowKey(record)));
      setData((previous) => previous.filter((item) => !deletedSet.has(toVoteRowKey(item))));
      table.resetRowSelection();
      toast.success(`Đã xóa ${records.length} vote`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa vote");
    } finally {
      setIsDeleting(false);
    }
  }, [selectedItems, table]);

  const handleExport = React.useCallback(
    (format: ExportFormat, _dateRange: DateRange) => {
      void _dateRange;
      setIsExporting(true);

      try {
        exportData({
          format,
          data: filteredData,
          headers: {
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
          },
          filename: `events${selectedBrand !== "all" ? `_${selectedBrand}` : ""}_${new Date().toISOString().split("T")[0]}`,
        });

        toast.success(`Xuất ${filteredData.length} bản ghi thành công`);
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

  const handleEventDay1Change = React.useCallback(async (nextDate: string) => {
    if (!nextDate) return;

    try {
      const response = await fetch("/api/event-settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ eventDay1: nextDate }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result.message ?? "Không thể lưu ngày sự kiện");
      }

      toast.success("Đã cập nhật ngày 1 sự kiện");
      window.location.reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu ngày sự kiện");
    }
  }, []);

  return (
    <div className="flex flex-col gap-4">
      <EventsSummary categoryRankings={categoryRankings} voteOptions={initialVoteOptions} />

      <div className="flex items-center justify-between gap-4">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative max-w-sm flex-1">
            <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
            <Input
              placeholder="Tìm kiếm theo tên, SĐT, email..."
              className="pl-10"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
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
        <SharedDataTable table={table} columns={columns} />
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
