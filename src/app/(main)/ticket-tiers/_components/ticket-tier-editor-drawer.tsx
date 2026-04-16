"use client";

import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { TicketTierRecord } from "@/lib/ticket-tiers";

import { formatMoney, formatTicketTierRange, type TicketTierForm } from "./ticket-tier-manager.utils";

function TicketTierReadonlyField({ id, label, value }: { id: string; label: string; value: string }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input id={id} value={value} readOnly disabled className="h-10 rounded-xl bg-slate-100" />
    </div>
  );
}

function TicketTierEditableField({
  id,
  label,
  value,
  type = "text",
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  type?: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        min={type === "number" ? "0" : undefined}
        value={value}
        onChange={onChange}
        className="h-10 rounded-xl bg-white"
      />
    </div>
  );
}

function TicketTierPreviewPanel({ form }: { form: TicketTierForm }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">Xem nhanh</div>
      <div className="mt-3 grid gap-3">
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">Gia thuong</div>
          <div className="mt-2 text-base font-semibold text-slate-900">
            {formatMoney(Number(form.regularPrice || 0))}
          </div>
        </div>
        <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
          <div className="text-muted-foreground text-[11px] font-medium tracking-[0.16em] uppercase">
            Gia khuyen mai
          </div>
          <div className="mt-2 text-base font-semibold text-slate-900">
            {form.promoPrice === "" ? "Chua cai dat" : formatMoney(Number(form.promoPrice || 0))}
          </div>
          <div className="mt-1 text-xs text-slate-500">
            {formatTicketTierRange(form.promoStart || null, form.promoEnd || null)}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TicketTierEditorDrawer({
  open,
  isMobile,
  saving,
  form,
  selectedTier,
  onOpenChange,
  onChange,
  onSave,
}: {
  open: boolean;
  isMobile: boolean;
  saving: boolean;
  form: TicketTierForm;
  selectedTier: TicketTierRecord | null;
  onOpenChange: (open: boolean) => void;
  onChange: (key: keyof TicketTierForm) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSave: () => void;
}) {
  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? "bottom" : "right"}>
      <DrawerContent className="h-screen sm:ml-auto sm:h-screen sm:max-w-[460px]">
        <DrawerHeader className="border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50/50">
          <div className="text-muted-foreground text-[11px] font-semibold tracking-[0.18em] uppercase">
            Cap nhat hạng vé
          </div>
          <DrawerTitle className="mt-1 text-2xl">{selectedTier?.code ?? form.code}</DrawerTitle>
          <DrawerDescription>{selectedTier?.name ?? form.name}</DrawerDescription>
        </DrawerHeader>

        <div className="nice-scroll flex-1 overflow-y-auto bg-slate-50/60 px-4 py-4">
          <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <div className="grid gap-4">
                <TicketTierReadonlyField id="ticket-code" label="Ma hạng vé" value={form.code} />
                <TicketTierReadonlyField id="ticket-name" label="Ten hien thi" value={form.name} />

                <div className="grid gap-4 md:grid-cols-2">
                  <TicketTierEditableField
                    id="ticket-price"
                    label="Gia ve"
                    type="number"
                    value={form.regularPrice}
                    onChange={onChange("regularPrice")}
                  />
                  <TicketTierEditableField
                    id="ticket-sale-price"
                    label="Gia khuyen mai"
                    type="number"
                    value={form.promoPrice}
                    onChange={onChange("promoPrice")}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TicketTierEditableField
                    id="ticket-sale-start"
                    label="Ngay bat dau KM"
                    type="date"
                    value={form.promoStart}
                    onChange={onChange("promoStart")}
                  />
                  <TicketTierEditableField
                    id="ticket-sale-end"
                    label="Ngay ket thuc KM"
                    type="date"
                    value={form.promoEnd}
                    onChange={onChange("promoEnd")}
                  />
                </div>
              </div>
            </div>

            <TicketTierPreviewPanel form={form} />
          </div>
        </div>

        <DrawerFooter className="border-t border-slate-200 bg-white/95">
          <div className="grid w-full grid-cols-2 gap-2">
            <DrawerClose asChild>
              <Button variant="outline" className="w-full rounded-xl" disabled={saving}>
                Huy
              </Button>
            </DrawerClose>
            <Button className="w-full rounded-xl" onClick={onSave} disabled={saving}>
              {saving ? "Dang luu..." : "Luu thay doi"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
