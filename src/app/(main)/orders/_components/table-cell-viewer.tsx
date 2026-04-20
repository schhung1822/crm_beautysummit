/* eslint-disable complexity */
"use client";

import * as React from "react";

import { toast } from "sonner";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useIsMobile } from "@/hooks/use-mobile";
import * as ticketOrders from "@/lib/ticket-orders";

import {
  OrderCustomerInfoSection,
  OrderExtraInfoSection,
  OrderMetaBadges,
  OrderQuickEditSection,
} from "./order-drawer-sections";
import { channelSchema } from "./schema";

type ViewerProps = {
  item: z.infer<typeof channelSchema>;
  onRowUpdated?: (updated: z.infer<typeof channelSchema>, originalOrderCode: string) => void;
  triggerElement?: React.ReactElement;
};

function formatDateVN(value: unknown) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("en-GB");
}

function formatGender(value?: string | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "f" || normalized === "female" || normalized === "nu") return "Nu";
  if (normalized === "m" || normalized === "male" || normalized === "nam") return "Nam";

  return value ?? "";
}

export function TableCellViewer({ item, onRowUpdated, triggerElement }: ViewerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [form, setForm] = React.useState<z.infer<typeof channelSchema>>(item);

  const ticketClassOptions = ["GOLD", "RUBY", "VIP"];
  const paymentStatusOptions = ["new", "paydone", "present", "cancelled"];
  const careerQuickOptions = ["Khác", "Chu spa/ TMV/ Phong kham", "Bac si", "Duoc si", "Ky thuat vien", "Sale"];

  React.useEffect(() => {
    setForm(item);
  }, [item]);

  const normalizedMoney = Number(form.money) || 0;
  const computedVat = Number(form.money_VAT) || normalizedMoney;

  const handleSave = React.useCallback(async () => {
    setIsSaving(true);

    try {
      const isCheckedIn = ticketOrders.normalizeCheckinFlag(form.is_checkin) === 1;
      const payload = channelSchema.parse({
        ...form,
        money: normalizedMoney,
        money_VAT: computedVat,
        status: form.status || "new",
        is_checkin: isCheckedIn ? 1 : 0,
        number_checkin: isCheckedIn ? Math.max(1, Number(form.number_checkin || 0)) : 0,
        status_checkin: ticketOrders.buildCheckinStatusLabel(isCheckedIn ? 1 : 0),
        update_time: new Date(),
        checkin_time: isCheckedIn ? (form.checkin_time ?? new Date()) : null,
      });

      const response = await fetch("/api/orders", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          originalOrderCode: item.ordercode,
          ...payload,
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => ({}));
        throw new Error(result?.error ?? "Không thể cập nhật bản ghi");
      }

      setForm(payload);
      setIsEditing(false);
      onRowUpdated?.(payload, item.ordercode);
      toast.success("Đã cập nhật bản ghi");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra khi cập nhật");
    } finally {
      setIsSaving(false);
    }
  }, [computedVat, form, item.ordercode, normalizedMoney, onRowUpdated]);

  const displayedItem = form;
  const createdAt = displayedItem.create_time ? formatDateVN(displayedItem.create_time) : "";
  const updatedAt = displayedItem.update_time ? formatDateVN(displayedItem.update_time) : "";
  const displayGender = displayedItem.gender ? formatGender(displayedItem.gender) : null;

  return (
    <Drawer
      direction={isMobile ? "bottom" : "right"}
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setIsEditing(false);
          setForm(item);
        }
      }}
    >
      <DrawerTrigger asChild>
        {triggerElement ?? (
          <Button
            variant="ghost"
            className="text-foreground block h-auto max-w-full min-w-0 justify-start px-0 py-0 text-left font-medium hover:bg-transparent"
            title={displayedItem.ordercode || undefined}
          >
            <span className="block max-w-full truncate">{displayedItem.ordercode}</span>
          </Button>
        )}
      </DrawerTrigger>

      <DrawerContent className="h-screen sm:ml-auto sm:h-screen sm:max-w-[420px]">
        <DrawerHeader className="supports-backdrop-filter:bg-background/80 bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DrawerTitle className="truncate" title={`Mã đơn: ${displayedItem.ordercode}`}>
                  Mã đơn: {displayedItem.ordercode}
                </DrawerTitle>
                <DrawerDescription className="truncate" title={displayedItem.class || undefined}>
                  {displayedItem.class ? <>• {displayedItem.class}</> : null}
                </DrawerDescription>
              </div>

              {displayedItem.status ? (
                <Badge variant="secondary" className="shrink-0 rounded-full" title={displayedItem.status}>
                  {displayedItem.status}
                </Badge>
              ) : null}
            </div>
          </div>
        </DrawerHeader>

        <div className="nice-scroll flex-1 overflow-y-auto px-4 py-4">
          <div className="grid gap-3">
            {isEditing ? (
              <OrderQuickEditSection
                form={form}
                setForm={setForm}
                ticketClassOptions={ticketClassOptions}
                paymentStatusOptions={paymentStatusOptions}
                careerQuickOptions={careerQuickOptions}
              />
            ) : null}

            <OrderCustomerInfoSection
              name={displayedItem.name}
              phone={displayedItem.phone}
              email={displayedItem.email}
            />

            <OrderMetaBadges createdAt={createdAt} updatedAt={updatedAt} gender={displayGender} />

            {!isEditing ? (
              <OrderExtraInfoSection
                career={displayedItem.career}
                status={displayedItem.status}
                isCheckin={displayedItem.is_checkin}
              />
            ) : null}
          </div>
        </div>

        <DrawerFooter className="supports-backdrop-filter:bg-background/80 bg-background/95 sticky bottom-0 z-10 border-t backdrop-blur">
          {isEditing ? (
            <div className="grid w-full grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="w-full rounded-xl"
                onClick={() => {
                  setIsEditing(false);
                  setForm(item);
                }}
                disabled={isSaving}
              >
                Hủy
              </Button>
              <Button className="w-full rounded-xl" onClick={() => void handleSave()} disabled={isSaving}>
                {isSaving ? "Đang lưu..." : "Lưu"}
              </Button>
            </div>
          ) : (
            <Button variant="default" className="w-full rounded-xl" onClick={() => setIsEditing(true)}>
              Sửa bản ghi
            </Button>
          )}

          <DrawerClose asChild>
            <Button variant="outline" className="w-full rounded-xl">
              Đóng
            </Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
