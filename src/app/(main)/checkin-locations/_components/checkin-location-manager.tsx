"use client";

import * as React from "react";
import type { ColumnDef } from "@tanstack/react-table";
import { ChevronLeft, ChevronRight, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { DataTable as SharedDataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/ui/date-picker";
import { useDataTableInstance } from "@/hooks/use-data-table-instance";
import { matchesSearchTerm } from "@/lib/search-utils";

export type CheckinLocation = {
  id: number;
  name: string;
  allowed_tiers: string;
  image_url: string | null;
  prerequisite: string | null;
  nc_order: number | null;
  is_active: number;
  event_date: string | null;
};

type CheckinHistoryRow = {
  id: number;
  ordercode: string;
  zoneId: string;
  zoneName: string;
  source: string;
  checkinTime: string | null;
  createdBy: string;
  name: string;
  phone: string;
  email: string;
  ticketClass: string;
  status: string;
};

type CheckinHistoryResponse = {
  data?: CheckinHistoryRow[];
  pagination?: { page: number; pageSize: number; total: number };
  error?: string;
};

const checkinHistoryColumns: ColumnDef<CheckinHistoryRow>[] = [
  {
    accessorKey: "checkinTime",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Thời gian" />,
    cell: ({ row }) => <span className="text-sm">{formatDateTime(row.original.checkinTime)}</span>,
    enableSorting: false,
    size: 145,
  },
  {
    accessorKey: "ordercode",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Mã đơn" />,
    cell: ({ row }) => <span className="font-mono">{row.original.ordercode || "-"}</span>,
    enableSorting: false,
    size: 130,
  },
  {
    accessorKey: "name",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Khách hàng" />,
    cell: ({ row }) => <span className="font-medium">{row.original.name || "-"}</span>,
    enableSorting: false,
    size: 170,
  },
  {
    accessorKey: "phone",
    header: ({ column }) => <DataTableColumnHeader column={column} title="SĐT" />,
    cell: ({ row }) => <span className="font-mono">{row.original.phone || "-"}</span>,
    enableSorting: false,
    size: 125,
  },
  {
    accessorKey: "email",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Email" />,
    cell: ({ row }) => <span className="block max-w-[190px] truncate">{row.original.email || "-"}</span>,
    enableSorting: false,
    size: 190,
  },
  {
    accessorKey: "ticketClass",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Hạng vé" />,
    cell: ({ row }) => <Badge variant="secondary">{row.original.ticketClass || "-"}</Badge>,
    enableSorting: false,
    size: 95,
  },
  {
    accessorKey: "zoneName",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Địa điểm" />,
    cell: ({ row }) => <span>{row.original.zoneName || row.original.zoneId || "-"}</span>,
    enableSorting: false,
    size: 190,
  },
  {
    accessorKey: "createdBy",
    header: ({ column }) => <DataTableColumnHeader column={column} title="Người quét" />,
    cell: ({ row }) => <span>{row.original.createdBy || "-"}</span>,
    enableSorting: false,
    size: 130,
  },
];

function formatDateTime(value: string | null) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function addDays(dateKey: string, days: number) {
  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setDate(date.getDate() + days);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function isAfterDate(dateKey: string, minDateKey: string) {
  return dateKey > minDateKey;
}

export function CheckinLocationManager({
  initialData,
  eventDay1,
}: {
  initialData: CheckinLocation[];
  eventDay1: string;
}) {
  const [data, setData] = React.useState<CheckinLocation[]>(initialData);
  const [open, setOpen] = React.useState(false);
  const [form, setForm] = React.useState<Partial<CheckinLocation>>({});
  const [isUploading, setIsUploading] = React.useState(false);
  const [history, setHistory] = React.useState<CheckinHistoryRow[]>([]);
  const [historySearch, setHistorySearch] = React.useState("");
  const [historyPage, setHistoryPage] = React.useState(1);
  const [historyPageSize, setHistoryPageSize] = React.useState(10000);
  const [historyTotal, setHistoryTotal] = React.useState(0);
  const [historyLoading, setHistoryLoading] = React.useState(false);

  const TICKET_TIERS = ["RUBY", "GOLD", "VIP"];
  const totalHistoryPages = Math.max(1, Math.ceil(historyTotal / historyPageSize));
  const minCheckinDate = addDays(eventDay1, 1);

  React.useEffect(() => {
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      const params = new URLSearchParams({
        page: String(historyPage),
        pageSize: String(historyPageSize),
      });
      if (historySearch.trim()) {
        params.set("q", historySearch.trim());
      }

      setHistoryLoading(true);
      fetch(`/api/checkin-history?${params.toString()}`, { signal: controller.signal })
        .then(async (response) => {
          const payload = (await response.json()) as CheckinHistoryResponse;
          if (!response.ok) {
            throw new Error(payload.error || "Không thể tải lịch sử check-in");
          }

          setHistory(payload.data ?? []);
          setHistoryTotal(payload.pagination?.total ?? 0);
        })
        .catch((error) => {
          if ((error as Error).name !== "AbortError") {
            toast.error(error instanceof Error ? error.message : "Không thể tải lịch sử check-in");
          }
        })
        .finally(() => {
          if (!controller.signal.aborted) {
            setHistoryLoading(false);
          }
        });
    }, 250);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [historyPage, historyPageSize, historySearch]);

  const toggleTier = (tier: string) => {
    const currentTiers = form.allowed_tiers ? form.allowed_tiers.split(",").filter(Boolean) : [];
    if (currentTiers.includes(tier)) {
      setForm({ ...form, allowed_tiers: currentTiers.filter((t) => t !== tier).join(",") });
    } else {
      setForm({ ...form, allowed_tiers: [...currentTiers, tier].join(",") });
    }
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);

      const res = await fetch("/api/upload", {
        method: "POST",
        body: formData,
      });
      const uploadData = await res.json();
      
      if (res.ok && uploadData.url) {
        setForm({ ...form, image_url: uploadData.url });
      } else {
        toast.error(uploadData.error || "Lỗi upload ảnh");
      }
    } catch {
      toast.error("Lỗi mạng khi upload");
    } finally {
      setIsUploading(false);
    }
  };

  const handleEdit = (item?: CheckinLocation) => {
    if (item) {
      setForm(item);
    } else {
      setForm({ name: "", allowed_tiers: "GOLD,RUBY,VIP", image_url: "", prerequisite: "", nc_order: data.length + 1, is_active: 1, event_date: minCheckinDate });
    }
    setOpen(true);
  };

  const handleSave = async () => {
    if (!form.name || !form.allowed_tiers) {
      toast.error("Vui lòng điền đủ tên và loại vé!");
      return;
    }
    if (!form.event_date) {
      toast.error("Vui lòng chọn ngày sự kiện cho địa điểm này!");
      return;
    }

    try {
      if (!isAfterDate(form.event_date, eventDay1)) {
        toast.error(`Ngày check-in phải sau ngày 1 sự kiện (${eventDay1.split("-").reverse().join("/")})`);
        return;
      }

      const res = await fetch("/api/checkin-locations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const resData = await res.json();
      if (res.ok) {
        toast.success("Lưu thành công");
        setOpen(false);
        // basic refetch
        const fetchRes = await fetch("/api/checkin-locations");
        const json = await fetchRes.json();
        setData(json.data);
      } else {
        toast.error(resData.error || "Lỗi khi lưu");
      }
    } catch (e: any) {
      toast.error(e?.message || "Lỗi khi lưu");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Bạn có chắc muốn xoá địa điểm này?")) return;
    try {
      const res = await fetch(`/api/checkin-locations/${id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Xoá thành công");
        setData((prev) => prev.filter((i) => i.id !== id));
      } else {
        toast.error("Lỗi xoá");
      }
    } catch {
      toast.error("Lỗi mạng");
    }
  };

  const filteredHistory = React.useMemo(
    () =>
      history.filter((item) =>
        matchesSearchTerm(historySearch, [
          item.ordercode,
          item.name,
          item.phone,
          item.email,
          item.ticketClass,
          item.zoneName,
          item.zoneId,
          item.createdBy,
        ]),
      ),
    [history, historySearch],
  );

  const historyTable = useDataTableInstance({
    data: filteredHistory,
    columns: checkinHistoryColumns,
    getRowId: (row) => String(row.id),
    enableRowSelection: false,
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-end">
        <Button onClick={() => handleEdit()}>
          <Plus className="mr-2 h-4 w-4" />
          Thêm địa điểm
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6">
        {data.map((item) => (
          <Card key={item.id} className="group flex flex-col overflow-hidden rounded-lg shadow-sm transition-shadow hover:shadow-md">
            {item.image_url ? (
              <div
                className="h-20 w-full shrink-0 bg-cover bg-center"
                style={{ backgroundImage: `url('${item.image_url}')` }}
              />
            ) : (
              <div className="flex h-20 w-full shrink-0 items-center justify-center bg-slate-100">
                <span className="text-xs text-slate-400">Chưa có ảnh</span>
              </div>
            )}
            <div className="flex min-w-0 flex-1 flex-col p-2">
              <div className="flex items-center justify-between mb-1">
                <h3 className="truncate text-sm font-semibold">{item.name}</h3>
                {!item.is_active && <Badge variant="outline" className="text-muted-foreground text-[10px] px-1 py-0 h-4">Ẩn</Badge>}
              </div>
              
              <div className="mb-2 space-y-1">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  <span className="font-medium dark:text-slate-300">Ngày:</span> {item.event_date ? item.event_date.split('-').reverse().join('/') : "Chưa chọn"}
                </p>
                <div className="flex flex-wrap gap-1">
                  <span className="text-xs font-medium text-slate-500 dark:text-slate-300 mr-1">Hạng vé:</span>
                  {item.allowed_tiers.split(",").map((t) => (
                    <Badge key={t} variant="secondary" className="text-[10px] px-1 py-0 h-4">
                      {t}
                    </Badge>
                  ))}
                </div>
                {item.prerequisite && (
                  <p className="text-xs text-rose-500 leading-tight">
                    Cần qua: {data.find((d) => String(d.id) === String(item.prerequisite))?.name || item.prerequisite}
                  </p>
                )}
              </div>

              <div className="mt-auto flex justify-end gap-1 border-t border-slate-100 pt-2">
                <Button size="icon" variant="outline" className="h-7 w-7" onClick={() => handleEdit(item)}>
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button size="icon" variant="destructive" className="h-7 w-7" onClick={() => handleDelete(item.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </Card>
        ))}
      </div>

      <Card className="overflow-hidden">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b px-4 py-3">
          <div>
            <h2 className="text-base font-semibold">Lịch sử check-in chi tiết</h2>
            <p className="text-xs text-muted-foreground">{historyTotal.toLocaleString("vi-VN")} bản ghi</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative w-[280px] max-w-full">
              <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={historySearch}
                onChange={(event) => {
                  setHistorySearch(event.target.value);
                }}
                placeholder="Tìm mã đơn, tên, SĐT, email, khu vực..."
                className="pl-9"
              />
            </div>
          </div>
        </div>

        <div className="px-4 py-3">
          {historyLoading ? (
            <div className="rounded-lg border px-4 py-8 text-center text-sm text-muted-foreground">
              Đang tải lịch sử check-in...
            </div>
          ) : (
            <SharedDataTable table={historyTable} columns={checkinHistoryColumns} />
          )}
        </div>

        <div className="hidden overflow-x-auto">
          <table className="w-full min-w-[980px] text-sm">
            <thead className="bg-muted/50 text-left text-xs uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-3 font-medium">Thời gian</th>
                <th className="px-4 py-3 font-medium">Mã đơn</th>
                <th className="px-4 py-3 font-medium">Khách hàng</th>
                <th className="px-4 py-3 font-medium">SĐT</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Hạng vé</th>
                <th className="px-4 py-3 font-medium">Địa điểm</th>
                <th className="px-4 py-3 font-medium">Người quét</th>
              </tr>
            </thead>
            <tbody>
              {historyLoading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Đang tải lịch sử check-in...
                  </td>
                </tr>
              ) : history.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-muted-foreground">
                    Chưa có dữ liệu phù hợp
                  </td>
                </tr>
              ) : (
                history.map((row) => (
                  <tr key={row.id} className="border-t">
                    <td className="whitespace-nowrap px-4 py-3">{formatDateTime(row.checkinTime)}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono">{row.ordercode || "-"}</td>
                    <td className="px-4 py-3">{row.name || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3 font-mono">{row.phone || "-"}</td>
                    <td className="px-4 py-3">{row.email || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{row.ticketClass || "-"}</td>
                    <td className="px-4 py-3">{row.zoneName || row.zoneId || "-"}</td>
                    <td className="whitespace-nowrap px-4 py-3">{row.createdBy || "-"}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        <div className="hidden flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-sm">
          <div className="text-muted-foreground">
            Trang {historyPage} / {totalHistoryPages}
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHistoryPage((page) => Math.max(1, page - 1))}
              disabled={historyPage <= 1 || historyLoading}
            >
              <ChevronLeft className="h-4 w-4" />
              Trước
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setHistoryPage((page) => Math.min(totalHistoryPages, page + 1))}
              disabled={historyPage >= totalHistoryPages || historyLoading}
            >
              Sau
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="bg-background dark:bg-slate-900 border-border dark:border-slate-800">
          <DialogHeader>
            <DialogTitle className="text-foreground">{form.id ? "Sửa địa điểm" : "Thêm địa điểm"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="flex gap-4">
              <div className="space-y-2 flex-1">
                <Label>Tên địa điểm</Label>
                <Input
                  value={form.name || ""}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Ví dụ: Cổng vào"
                />
              </div>
              <div className="space-y-2 flex flex-col items-center">
                <Label>Active</Label>
                <div className="h-10 flex items-center">
                  <Switch
                    checked={form.is_active !== 0}
                    onCheckedChange={(checked) => setForm({ ...form, is_active: checked ? 1 : 0 })}
                  />
                </div>
              </div>
            </div>
            <div className="space-y-3 mb-2">
              <Label>Loại vé cho phép check-in địa điểm này</Label>
              <div className="flex gap-4">
                {TICKET_TIERS.map((tier) => (
                  <div key={tier} className="flex items-center space-x-2">
                    <Checkbox
                      id={`tier-${tier}`}
                      checked={!!form.allowed_tiers?.split(",").includes(tier)}
                      onCheckedChange={() => toggleTier(tier)}
                    />
                    <Label htmlFor={`tier-${tier}`} className="text-sm font-normal">
                      {tier}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Ảnh địa điểm</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={isUploading}
              />
              {isUploading && <p className="text-xs text-muted-foreground">Đang tải ảnh lên...</p>}
              {form.image_url && (
                <div className="mt-2 w-full h-40 sm:h-48 rounded-xl bg-cover bg-center border shadow-sm" style={{ backgroundImage: `url('${form.image_url}')` }} />
              )}
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Địa điểm cần check-in trước</Label>
                <Select
                  value={form.prerequisite || "none"}
                  onValueChange={(val) => setForm({ ...form, prerequisite: val === "none" ? null : val })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Chọn khu vực..." />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Không yêu cầu</SelectItem>
                    {data
                      .filter((d) => d.id !== form.id)
                      .map((d) => (
                        <SelectItem key={d.id} value={String(d.id)}>
                          {d.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Ngày diễn ra Check-in</Label>
                <DatePicker
                  value={form.event_date || ""}
                  onChange={(val) => setForm({ ...form, event_date: val })}
                />
              </div>
            </div>
          </div>
          <div className="flex justify-end">
            <Button onClick={handleSave}>Lưu lại</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
