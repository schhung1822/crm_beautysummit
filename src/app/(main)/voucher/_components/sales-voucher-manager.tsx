"use client";

import * as React from "react";

import { BadgePercent, Plus, Search, Ticket, WalletCards } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { SalesVoucherRecord } from "@/lib/sales-vouchers";

import { SalesVoucherFormDialog } from "./sales-voucher-form-dialog";
import {
  createVoucherFormState,
  DEFAULT_SALES_VOUCHER_FORM,
  isVoucherActive,
  matchesSalesVoucherKeyword,
  toSalesVoucherPayload,
  type SalesVoucherForm,
} from "./sales-voucher-manager.utils";
import { SalesVoucherTable } from "./sales-voucher-table";

type SalesVoucherManagerProps = {
  initialData: SalesVoucherRecord[];
};

async function saveSalesVoucherRequest(form: SalesVoucherForm) {
  const response = await fetch("/api/voucher", {
    method: form.id == null ? "POST" : "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(toSalesVoucherPayload(form)),
  });
  const result = (await response.json().catch(() => ({}))) as { data?: SalesVoucherRecord; message?: string };
  if (!response.ok || !result.data) {
    throw new Error(result.message ?? "Không thể lưu voucher");
  }

  return result.data;
}

async function deleteSalesVoucherRequest(id: number) {
  const response = await fetch("/api/voucher", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id }),
  });
  const result = (await response.json().catch(() => ({}))) as { deleted?: number; message?: string };
  if (!response.ok) {
    throw new Error(result.message ?? "Không thể xóa voucher");
  }

  return Number(result.deleted ?? 0);
}

function SummaryCard({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return (
    <div className="bg-card text-card-foreground rounded-xl border px-4 py-3 shadow-sm">
      <div className="text-muted-foreground flex items-center gap-2 text-xs font-medium">
        {icon}
        {label}
      </div>
      <div className="text-foreground mt-2 text-lg font-semibold">{value.toLocaleString("en-US")}</div>
    </div>
  );
}

export default function SalesVoucherManager({ initialData }: SalesVoucherManagerProps) {
  const [data, setData] = React.useState(initialData);
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [deletingId, setDeletingId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<SalesVoucherForm>(DEFAULT_SALES_VOUCHER_FORM);

  const filteredData = React.useMemo(
    () => data.filter((item) => matchesSalesVoucherKeyword(item, search)),
    [data, search],
  );
  const activeCount = React.useMemo(() => data.filter((item) => isVoucherActive(item)).length, [data]);
  const totalIssued = React.useMemo(
    () => data.reduce((total, item) => total + Math.max(0, item.number ?? 0), 0),
    [data],
  );

  const openCreateDialog = React.useCallback(() => {
    setForm(DEFAULT_SALES_VOUCHER_FORM);
    setOpen(true);
  }, []);

  const openEditDialog = React.useCallback((item: SalesVoucherRecord) => {
    setForm(createVoucherFormState(item));
    setOpen(true);
  }, []);

  const handleSave = React.useCallback(async () => {
    setSaving(true);
    try {
      const saved = await saveSalesVoucherRequest(form);
      setData((current) => {
        if (form.id == null) {
          return [saved, ...current];
        }

        return current.map((item) => (item.id === saved.id ? saved : item));
      });
      setOpen(false);
      setForm(DEFAULT_SALES_VOUCHER_FORM);
      toast.success(form.id == null ? "Đã tạo voucher" : "Đã cập nhật voucher");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu voucher");
    } finally {
      setSaving(false);
    }
  }, [form]);

  const handleDelete = React.useCallback(async (item: SalesVoucherRecord) => {
    const confirmed = window.confirm(`Xóa voucher ${item.voucher}?`);
    if (!confirmed) {
      return;
    }

    setDeletingId(item.id);
    try {
      await deleteSalesVoucherRequest(item.id);
      setData((current) => current.filter((voucher) => voucher.id !== item.id));
      toast.success("Đã xóa voucher");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể xóa voucher");
    } finally {
      setDeletingId(null);
    }
  }, []);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div>
              <div className="text-muted-foreground text-sm font-medium">Quản lý bán vé</div>
              <h2 className="text-foreground mt-1 text-2xl font-semibold">Quản lý voucher</h2>
            </div>
            <div className="flex w-full flex-col gap-2 sm:flex-row lg:w-auto">
              <div className="relative w-full sm:w-72">
                <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Tìm theo mã, kiểu, hạng vé..."
                  className="bg-background h-10 rounded-lg pl-10 shadow-sm"
                />
              </div>
              <Button onClick={openCreateDialog}>
                <Plus className="mr-2 size-4" />
                Thêm voucher
              </Button>
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <SummaryCard icon={<WalletCards className="size-4" />} label="Tổng voucher" value={data.length} />
            <SummaryCard icon={<BadgePercent className="size-4" />} label="Đang hiệu lực" value={activeCount} />
            <SummaryCard icon={<Ticket className="size-4" />} label="Tổng số lượng" value={totalIssued} />
          </div>
        </div>

        <SalesVoucherTable
          data={filteredData}
          deletingId={deletingId}
          onEdit={openEditDialog}
          onDelete={handleDelete}
        />
      </div>

      <SalesVoucherFormDialog
        open={open}
        form={form}
        saving={saving}
        onOpenChange={setOpen}
        onFormChange={setForm}
        onSave={() => void handleSave()}
      />
    </>
  );
}
