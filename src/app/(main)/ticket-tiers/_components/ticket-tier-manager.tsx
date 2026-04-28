"use client";

import * as React from "react";

import { BadgePercent, Search, Tag, Ticket } from "lucide-react";
import { toast } from "sonner";

import { Input } from "@/components/ui/input";
import { useIsMobile } from "@/hooks/use-mobile";
import type { TicketTierRecord } from "@/lib/ticket-tiers";

import { TicketTierCard } from "./ticket-tier-card";
import { TicketTierEditorDrawer } from "./ticket-tier-editor-drawer";
import {
  createTicketTierFormState,
  DEFAULT_TICKET_TIER_FORM,
  matchesTicketTierKeyword,
  type TicketTierForm,
} from "./ticket-tier-manager.utils";
import { TicketTierSummaryCard } from "./ticket-tier-summary-card";

type TicketTierManagerProps = {
  initialData: TicketTierRecord[];
};

async function updateTicketTierRequest(form: TicketTierForm) {
  const payload = {
    id: form.id ?? undefined,
    regularPrice: Number(String(form.regularPrice || "0").replace(/,/g, "")),
    promoPrice: form.promoPrice === "" ? null : Number(String(form.promoPrice).replace(/,/g, "")),
    promoStart: form.promoStart || null,
    promoEnd: form.promoEnd || null,
  };

  const response = await fetch("/api/ticket-tiers", {
    method: "PUT",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  const result = (await response.json().catch(() => ({}))) as { data?: TicketTierRecord; message?: string };
  if (!response.ok || !result.data) {
    throw new Error(result.message ?? "Không thể lưu hạng vé");
  }

  return result.data;
}

export default function TicketTierManager({ initialData }: TicketTierManagerProps) {
  const isMobile = useIsMobile();
  const [data, setData] = React.useState(initialData);
  const [search, setSearch] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [selectedTierId, setSelectedTierId] = React.useState<number | null>(null);
  const [form, setForm] = React.useState<TicketTierForm>(DEFAULT_TICKET_TIER_FORM);

  const filteredData = React.useMemo(
    () => data.filter((item) => matchesTicketTierKeyword(item, search)),
    [data, search],
  );
  const activePromoCount = React.useMemo(() => data.filter((item) => item.promoPrice != null).length, [data]);
  const selectedTier = React.useMemo(
    () => data.find((item) => item.id === selectedTierId) ?? null,
    [data, selectedTierId],
  );

  const openEditor = React.useCallback((item: TicketTierRecord) => {
    setSelectedTierId(item.id);
    setForm(createTicketTierFormState(item));
    setOpen(true);
  }, []);

  const resetEditor = React.useCallback(() => {
    setSelectedTierId(null);
    setForm(DEFAULT_TICKET_TIER_FORM);
  }, []);

  const handleChange = React.useCallback(
    (key: keyof TicketTierForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
    },
    [],
  );

  const handleSave = React.useCallback(async () => {
    if (form.promoStart && form.promoEnd) {
      const start = new Date(form.promoStart);
      const end = new Date(form.promoEnd);
      if (end < start) {
        toast.error("Ngày kết thúc KM phải lớn hơn hoặc bằng ngày bắt đầu KM");
        return;
      }
    }

    setSaving(true);
    try {
      const saved = await updateTicketTierRequest(form);
      setData((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      setOpen(false);
      resetEditor();
      toast.success("Đã cập nhật hạng vé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể lưu hạng vé");
    } finally {
      setSaving(false);
    }
  }, [form, resetEditor]);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-muted-foreground text-sm font-medium">Quản lý hạng vé</div>
              <h2 className="text-foreground mt-1 text-2xl font-semibold">Bảng giá vé và lịch khuyến mãi</h2>
            </div>

            <div className="relative w-full max-w-sm">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tìm theo mã hoặc tên hạng vé..."
                className="bg-background h-10 rounded-lg pl-10 shadow-sm"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <TicketTierSummaryCard
              icon={<Ticket className="size-4" />}
              label="Tổng hạng vé"
              value={String(data.length)}
            />
            <TicketTierSummaryCard
              icon={<BadgePercent className="size-4" />}
              label="Đang có khuyến mãi"
              value={String(activePromoCount)}
            />
            <TicketTierSummaryCard
              icon={<Tag className="size-4" />}
              label="Kết quả tìm kiếm"
              value={String(filteredData.length)}
            />
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="bg-card text-muted-foreground rounded-xl border border-dashed px-6 py-12 text-center text-sm">
            Không tìm thấy hạng vé phù hợp.
          </div>
        ) : (
          <div className="grid gap-4 xl:grid-cols-3">
            {filteredData.map((item) => (
              <TicketTierCard key={item.id} item={item} onEdit={openEditor} />
            ))}
          </div>
        )}
      </div>

      <TicketTierEditorDrawer
        open={open}
        isMobile={isMobile}
        saving={saving}
        form={form}
        selectedTier={selectedTier}
        onOpenChange={(nextOpen) => {
          setOpen(nextOpen);
          if (!nextOpen) {
            resetEditor();
          }
        }}
        onChange={handleChange}
        onSave={() => void handleSave()}
      />
    </>
  );
}
