"use client";

import { Button } from "@/components/ui/button";
import { DatePicker } from "@/components/ui/date-picker";
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
      <Label htmlFor={id} className="text-foreground">
        {label}
      </Label>
      <Input id={id} value={value} readOnly disabled className="bg-muted text-muted-foreground h-10 rounded-lg" />
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
      <Label htmlFor={id} className="text-foreground">
        {label}
      </Label>
      {type === "date" ? (
        <DatePicker
          id={id}
          value={value}
          onChange={(newDateStr) => {
            const simulatedEvent = {
              target: { value: newDateStr },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(simulatedEvent);
          }}
          className="bg-background h-10 rounded-lg"
        />
      ) : type === "money" ? (
        <Input
          id={id}
          type="text"
          value={value}
          onChange={(e) => {
            const numericString = e.target.value.replace(/[^0-9]/g, "");
            const formattedStr = numericString ? Number(numericString).toLocaleString("en-US") : "";
            const simulatedEvent = {
              target: { value: formattedStr },
            } as React.ChangeEvent<HTMLInputElement>;
            onChange(simulatedEvent);
          }}
          className="bg-background h-10 rounded-lg"
        />
      ) : (
        <Input
          id={id}
          type={type}
          min={type === "number" ? "0" : undefined}
          value={value}
          onChange={onChange}
          className="bg-background h-10 rounded-lg"
        />
      )}
    </div>
  );
}

function TicketTierPreviewPanel({ form }: { form: TicketTierForm }) {
  return (
    <div className="bg-card text-card-foreground rounded-xl border p-4 shadow-sm">
      <div className="text-muted-foreground text-sm font-medium">Xem nhanh</div>
      <div className="mt-3 grid gap-3">
        <div className="bg-muted/40 rounded-lg border px-4 py-3">
          <div className="text-muted-foreground text-xs font-medium">Giá thường</div>
          <div className="text-foreground mt-2 text-base font-semibold">
            {formatMoney(Number(String(form.regularPrice || 0).replace(/,/g, "")))}
          </div>
        </div>
        <div className="bg-muted/40 rounded-lg border px-4 py-3">
          <div className="text-muted-foreground text-xs font-medium">Giá khuyến mãi</div>
          <div className="text-foreground mt-2 text-base font-semibold">
            {form.promoPrice === ""
              ? "Chưa cài đặt"
              : formatMoney(Number(String(form.promoPrice || 0).replace(/,/g, "")))}
          </div>
          <div className="text-muted-foreground mt-1 text-xs">
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
      <DrawerContent className="bg-background border-border h-screen sm:ml-auto sm:h-screen sm:max-w-[460px]">
        <DrawerHeader className="bg-background border-border border-b">
          <div className="text-muted-foreground text-sm font-medium">Cập nhật hạng vé</div>
          <DrawerTitle className="text-foreground mt-1 text-2xl">{selectedTier?.code ?? form.code}</DrawerTitle>
          <DrawerDescription>{selectedTier?.name ?? form.name}</DrawerDescription>
        </DrawerHeader>

        <div className="nice-scroll bg-muted/10 flex-1 overflow-y-auto px-4 py-4">
          <div className="grid gap-4">
            <div className="bg-card rounded-xl border p-4 shadow-sm">
              <div className="grid gap-4">
                <TicketTierReadonlyField id="ticket-code" label="Mã hạng vé" value={form.code} />
                <TicketTierReadonlyField id="ticket-name" label="Tên hiển thị" value={form.name} />

                <div className="grid gap-4 md:grid-cols-2">
                  <TicketTierEditableField
                    id="ticket-price"
                    label="Giá vé"
                    type="money"
                    value={form.regularPrice}
                    onChange={onChange("regularPrice")}
                  />
                  <TicketTierEditableField
                    id="ticket-sale-price"
                    label="Giá khuyến mãi"
                    type="money"
                    value={form.promoPrice}
                    onChange={onChange("promoPrice")}
                  />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <TicketTierEditableField
                    id="ticket-sale-start"
                    label="Ngày bắt đầu KM"
                    type="date"
                    value={form.promoStart}
                    onChange={onChange("promoStart")}
                  />
                  <TicketTierEditableField
                    id="ticket-sale-end"
                    label="Ngày kết thúc KM"
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

        <DrawerFooter className="bg-background border-t">
          <div className="grid w-full grid-cols-2 gap-2">
            <DrawerClose asChild>
              <Button variant="outline" className="w-full rounded-xl" disabled={saving}>
                Hủy
              </Button>
            </DrawerClose>
            <Button className="w-full rounded-xl" onClick={onSave} disabled={saving}>
              {saving ? "Đang lưu..." : "Lưu thay đổi"}
            </Button>
          </div>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
