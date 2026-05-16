"use client";

import * as React from "react";

import {
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type PaginationState,
} from "@tanstack/react-table";
import { CalendarIcon, Download, Search, X } from "lucide-react";
import { toast } from "sonner";

import { DataTable as SharedDataTable } from "@/components/data-table/data-table";
import { withSelectionColumn } from "@/components/data-table/selection-toggle";
import { Button } from "@/components/ui/button";
import { ExportDialog, type DateRange, type ExportFormat } from "@/components/ui/export-dialog";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { exportData, filterDataByDateRange } from "@/lib/export-utils";
import { matchesSearchTerm } from "@/lib/search-utils";

import { dashboardColumns as makeColumns } from "./columns";
import type { Channel } from "./schema";

// ─── helpers ─────────────────────────────────────────────────────────────────

function toOrderRowKey(item: Pick<Channel, "ordercode" | "phone" | "create_time">) {
  return `${item.ordercode || item.phone || ""}-${item.create_time?.toString() ?? ""}`;
}

function normalizeGender(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (!v) return "";
  if (v === "f" || v === "female" || v === "nữ" || v === "nu") return "Nữ";
  if (v === "m" || v === "male" || v === "nam") return "Nam";
  return raw.trim();
}

function isCompletedStatus(s: string) {
  const v = s.trim().toLowerCase();
  return (
    v === "paydone" || v === "paid" || v === "completed" ||
    v.includes("hoàn thành") || v.includes("thành công") || v.includes("đã thanh toán")
  );
}

// ─── Date range picker ───────────────────────────────────────────────────────

function DateRangePicker({
  value,
  onChange,
}: {
  value: { from: string; to: string };
  onChange: (v: { from: string; to: string }) => void;
}) {
  const label =
    value.from && value.to
      ? `${value.from} → ${value.to}`
      : value.from ? `Từ ${value.from}` : value.to ? `Đến ${value.to}` : "Chọn ngày";

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="h-9 gap-1.5 text-sm">
          <CalendarIcon className="size-3.5" />
          <span className="max-w-[160px] truncate">{label}</span>
          {(value.from || value.to) && (
            <X className="size-3.5 text-muted-foreground hover:text-foreground" onClick={(e) => { e.stopPropagation(); onChange({ from: "", to: "" }); }} />
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-72 p-4" align="start">
        <div className="flex flex-col gap-3">
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Từ ngày</label>
            <Input type="date" value={value.from} onChange={(e) => onChange({ ...value, from: e.target.value })} className="h-8 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-muted-foreground">Đến ngày</label>
            <Input type="date" value={value.to} onChange={(e) => onChange({ ...value, to: e.target.value })} className="h-8 text-sm" />
          </div>
          {(value.from || value.to) && (
            <Button variant="ghost" size="sm" className="w-full text-xs" onClick={() => onChange({ from: "", to: "" })}>
              <X className="size-3.5 mr-1" /> Xóa bộ lọc ngày
            </Button>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ─── Filter select ────────────────────────────────────────────────────────────

function FilterSelect({ placeholder, value, options, onChange }: {
  placeholder: string; value: string;
  options: { label: string; value: string }[];
  onChange: (v: string) => void;
}) {
  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-9 min-w-[130px] text-sm">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="__all__">{placeholder}</SelectItem>
        {options.map((opt) => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
      </SelectContent>
    </Select>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

function OrdersDataTable({ data: initialData = [] }: { data?: Channel[] }) {
  const [data, setData] = React.useState<Channel[]>(() => initialData);
  const [searchTerm, setSearchTerm] = React.useState("");
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [isExporting, setIsExporting] = React.useState(false);
  const [isDeleting, setIsDeleting] = React.useState(false);
  const [rowSelection, setRowSelection] = React.useState({});
  const [pagination, setPagination] = React.useState<PaginationState>({ pageIndex: 0, pageSize: 20 });

  // ── filters ──
  const [dateRange, setDateRange] = React.useState({ from: "", to: "" });
  const [filterTier, setFilterTier] = React.useState("__all__");
  const [filterGender, setFilterGender] = React.useState("__all__");
  const [filterStatus, setFilterStatus] = React.useState("__all__");
  const [filterCheckin, setFilterCheckin] = React.useState("__all__");

  React.useEffect(() => { setData(initialData); }, [initialData]);

  // Reset page to 0 when filters change
  React.useEffect(() => {
    setPagination((prev) => ({ ...prev, pageIndex: 0 }));
  }, [searchTerm, dateRange, filterTier, filterGender, filterStatus, filterCheckin]);

  const tierOptions = React.useMemo(() => {
    const set = new Set<string>();
    for (const ch of data) {
      const v = String(ch.class ?? "").trim().toUpperCase();
      if (v) set.add(v);
    }
    return Array.from(set).sort().map((v) => ({ label: v, value: v }));
  }, [data]);

  const activeFilterCount = [
    dateRange.from || dateRange.to,
    filterTier !== "__all__",
    filterGender !== "__all__",
    filterStatus !== "__all__",
    filterCheckin !== "__all__",
  ].filter(Boolean).length;

  const handleResetFilters = () => {
    setDateRange({ from: "", to: "" });
    setFilterTier("__all__");
    setFilterGender("__all__");
    setFilterStatus("__all__");
    setFilterCheckin("__all__");
    setSearchTerm("");
  };

  const handleRowUpdated = React.useCallback((updated: Channel, originalOrderCode: string) => {
    setData((prev) => prev.map((item) => (item.ordercode === originalOrderCode ? updated : item)));
  }, []);

  const handleDeleteRow = React.useCallback(async (row: Channel) => {
    try {
      if (!row.ordercode) throw new Error("Bản ghi không có mã đơn để xóa");
      const response = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCodes: [row.ordercode] }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error ?? "Không thể xóa bản ghi");
      }
      setData((prev) => prev.filter((item) => item.ordercode !== row.ordercode));
      toast.success("Đã xóa bản ghi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa bản ghi");
    }
  }, []);

  const columns = React.useMemo(
    () => withSelectionColumn(makeColumns(handleRowUpdated, handleDeleteRow)),
    [handleRowUpdated, handleDeleteRow],
  );

  const filteredData = React.useMemo(() => {
    let result = data;
    if (searchTerm) {
      result = result.filter((item) =>
        matchesSearchTerm(searchTerm, [item.ordercode, item.name, item.phone, item.email, item.class, item.hope, item.voucher]),
      );
    }
    if (dateRange.from || dateRange.to) {
      const from = dateRange.from ? new Date(dateRange.from) : undefined;
      const to = dateRange.to ? new Date(dateRange.to + "T23:59:59") : undefined;
      result = result.filter((item) => {
        if (!item.create_time) return false;
        const d = item.create_time instanceof Date ? item.create_time : new Date(String(item.create_time));
        if (from && d < from) return false;
        if (to && d > to) return false;
        return true;
      });
    }
    if (filterTier !== "__all__") result = result.filter((item) => String(item.class ?? "").trim().toUpperCase() === filterTier);
    if (filterGender !== "__all__") result = result.filter((item) => normalizeGender(item.gender ?? "") === filterGender);
    if (filterStatus !== "__all__") {
      if (filterStatus === "paydone") result = result.filter((item) => isCompletedStatus(item.status ?? ""));
      else result = result.filter((item) => !isCompletedStatus(item.status ?? ""));
    }
    if (filterCheckin !== "__all__") {
      if (filterCheckin === "checked") result = result.filter((item) => (item.is_checkin ?? 0) > 0);
      else result = result.filter((item) => (item.is_checkin ?? 0) === 0);
    }
    return result;
  }, [data, searchTerm, dateRange, filterTier, filterGender, filterStatus, filterCheckin]);

  const getRowId = React.useCallback((row: Channel) => toOrderRowKey(row), []);

  const table = useReactTable({
    data: filteredData,
    columns,
    state: { rowSelection, pagination },
    onRowSelectionChange: setRowSelection,
    onPaginationChange: setPagination,
    getRowId,
    enableRowSelection: true,
    enableMultiRowSelection: true,
    autoResetPageIndex: false,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
  });

  const selectedItems = table.getSelectedRowModel().rows.map((r) => r.original);

  const handleDeleteSelected = async () => {
    const orderCodes = selectedItems.map((i) => i.ordercode).filter((v): v is string => Boolean(v));
    if (!orderCodes.length) { toast.warning("Vui lòng chọn đơn hàng cần xóa"); return; }
    if (!window.confirm(`Xóa ${orderCodes.length} đơn hàng đã chọn?`)) return;
    setIsDeleting(true);
    try {
      const res = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderCodes }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? "Không thể xóa");
      const deletedSet = new Set(orderCodes);
      setData((prev) => prev.filter((item) => !deletedSet.has(item.ordercode)));
      table.resetRowSelection();
      toast.success(`Đã xóa ${orderCodes.length} đơn hàng`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa");
    } finally { setIsDeleting(false); }
  };

  const handleExport = React.useCallback((format: ExportFormat, dateRangeExp: DateRange) => {
    setIsExporting(true);
    try {
      const dataToExport = dateRangeExp.from || dateRangeExp.to
        ? filterDataByDateRange(filteredData, "create_time", dateRangeExp) : filteredData;
      exportData({
        format, data: dataToExport,
        headers: {
          ordercode: "Mã vé", name: "Họ tên", phone: "Số điện thoại", email: "Email",
          class: "Hạng vé", money: "Tiền", money_VAT: "Thành tiền", status: "Trạng thái",
          gender: "Giới tính", career: "Nghề nghiệp", hope: "Mong đợi",
          voucher: "Voucher", is_checkin: "Check-in", status_checkin: "Trạng thái CK",
          checkin_time: "Ngày check-in", create_time: "Ngày tạo",
        },
        filename: `orders_${new Date().toISOString().split("T")[0]}`,
      });
      toast.success(`Xuất ${dataToExport.length} đơn thành công`);
      setExportDialogOpen(false);
    } catch { toast.error("Có lỗi xảy ra khi xuất dữ liệu"); }
    finally { setIsExporting(false); }
  }, [filteredData]);

  return (
    <div className="flex h-full min-h-0 w-full min-w-0 max-w-full flex-1 basis-0 flex-col gap-3 overflow-hidden">
      {/* Row 1: search + export */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] flex-1">
          <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
          <Input placeholder="Tìm kiếm theo mã, tên, SĐT, email..." className="h-9 pl-10 text-sm" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
        </div>
        <div className="flex items-center gap-2 ml-auto">
          {selectedItems.length > 0 && (
            <Button size="sm" variant="destructive" onClick={handleDeleteSelected} disabled={isDeleting} className="h-9">
              {isDeleting ? "Đang xóa..." : `Xóa (${selectedItems.length})`}
            </Button>
          )}
          <Button variant="outline" size="sm" className="h-9" onClick={() => setExportDialogOpen(true)} disabled={filteredData.length === 0}>
            <Download className="size-4" /><span className="hidden sm:inline">Xuất</span>
          </Button>
        </div>
      </div>

      {/* Row 2: filters */}
      <div className="flex shrink-0 flex-wrap items-center gap-2">
        <DateRangePicker value={dateRange} onChange={setDateRange} />
        <FilterSelect placeholder="Hạng vé" value={filterTier} options={tierOptions} onChange={setFilterTier} />
        <FilterSelect placeholder="Giới tính" value={filterGender} options={[{ label: "Nam", value: "Nam" }, { label: "Nữ", value: "Nữ" }]} onChange={setFilterGender} />
        <FilterSelect placeholder="Thanh toán" value={filterStatus} options={[{ label: "Đã thanh toán", value: "paydone" }, { label: "Chưa thanh toán", value: "new" }]} onChange={setFilterStatus} />
        <FilterSelect placeholder="Check-in" value={filterCheckin} options={[{ label: "Đã check-in", value: "checked" }, { label: "Chưa check-in", value: "not_checked" }]} onChange={setFilterCheckin} />
        {activeFilterCount > 0 && (
          <Button variant="ghost" size="sm" className="h-9 gap-1.5 text-xs text-muted-foreground" onClick={handleResetFilters}>
            <X className="size-3.5" /> Xóa {activeFilterCount} bộ lọc
          </Button>
        )}
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">
          {filteredData.length.toLocaleString("vi-VN")} / {data.length.toLocaleString("vi-VN")} đơn
        </span>
      </div>

      {/* Table */}
      <div className="min-h-0 min-w-0 max-w-full flex-1 basis-0 overflow-hidden">
        <SharedDataTable
          table={table} columns={columns} stickyFooter
          className="h-full min-h-0 min-w-0 max-w-full flex-1 basis-0 overflow-hidden nice-scroll"
          viewportClassName="min-h-0 min-w-0 max-w-full flex-1 basis-0 overflow-hidden"
          footerClassName="shrink-0 rounded-xl"
        />
      </div>

      <ExportDialog
        open={exportDialogOpen} onOpenChange={setExportDialogOpen}
        onExport={handleExport} isExporting={isExporting}
        title="Xuất dữ liệu đơn hàng"
        description="Chọn định dạng và khoảng thời gian để xuất dữ liệu"
      />
    </div>
  );
}

export default OrdersDataTable;
