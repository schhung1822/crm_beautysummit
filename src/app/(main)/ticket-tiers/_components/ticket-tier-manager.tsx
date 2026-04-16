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
    regularPrice: Number(form.regularPrice || 0),
    promoPrice: form.promoPrice === "" ? null : Number(form.promoPrice),
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
    throw new Error(result.message ?? "Khong the luu hạng vé");
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
    setSaving(true);
    try {
      const saved = await updateTicketTierRequest(form);
      setData((prev) => prev.map((item) => (item.id === saved.id ? saved : item)));
      setOpen(false);
      resetEditor();
      toast.success("Da cap nhat hạng vé");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the luu hạng vé");
    } finally {
      setSaving(false);
    }
  }, [form, resetEditor]);

  return (
    <>
      <div className="flex flex-col gap-6">
        <div className="rounded-3xl border border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50/60 p-5 shadow-sm">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="text-muted-foreground text-[11px] font-semibold tracking-[0.2em] uppercase">
                Quản lý hạng vé
              </div>
              <h2 className="mt-1 text-2xl font-semibold text-slate-950">Bang gia ve va lich khuyen mai</h2>
              <p className="mt-2 max-w-xl text-sm leading-6 text-slate-600">
                Quản lý 3 hạng vé co dinh GOLD, VIP, RUBY. Admin chi sua gia thuong, gia khuyen mai va khoang thoi gian
                ap dung.
              </p>
            </div>

            <div className="relative w-full max-w-sm">
              <Search className="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Tim theo ma hoac ten hạng vé..."
                className="h-10 rounded-xl border-slate-200 bg-white pl-10 shadow-sm"
              />
            </div>
          </div>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <TicketTierSummaryCard
              icon={<Ticket className="size-4" />}
              label="Tong hạng vé"
              value={String(data.length)}
            />
            <TicketTierSummaryCard
              icon={<BadgePercent className="size-4" />}
              label="Dang co khuyen mai"
              value={String(activePromoCount)}
            />
            <TicketTierSummaryCard
              icon={<Tag className="size-4" />}
              label="Ket qua tim kiem"
              value={String(filteredData.length)}
            />
          </div>
        </div>

        {filteredData.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white px-6 py-12 text-center text-sm text-slate-500">
            Khong tim thay hạng vé phu hop.
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
