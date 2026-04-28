/* eslint-disable max-lines */
"use client";

import * as React from "react";

import { useRouter } from "next/navigation";

import { PlusCircleIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SidebarMenuButton } from "@/components/ui/sidebar";

import {
  calculateTotalAmount,
  exportVatInvoicePdf,
  getFirstOrderCode,
  getOrderApiError,
  initialAddTicketForm,
  parseMoneyInput,
  prepareOrderSubmission,
} from "./add-ticket-drawer.utils";

const ticketTypeOptions = [
  { label: "Vé mua", value: "paid" },
  { label: "Vé tặng", value: "gift" },
] as const;

const genderOptions = [
  { label: "Nam", value: "m" },
  { label: "Nữ", value: "f" },
] as const;

type TicketTierOption = {
  id: number;
  code: string;
  name: string;
  regularPrice: number;
  promoPrice: number | null;
  effectivePrice: number;
  isActive: boolean;
};

type FormKey = keyof typeof initialAddTicketForm;

export function AddTicketDrawer() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState(initialAddTicketForm);
  const [now, setNow] = React.useState(() => new Date());
  const [ticketTiers, setTicketTiers] = React.useState<TicketTierOption[]>([]);

  const unitPriceValue = React.useMemo(() => parseMoneyInput(form.money), [form.money]);
  const quantityValue = React.useMemo(() => Math.max(1, Number(form.quantity || 1) || 1), [form.quantity]);
  const totalAmountValue = React.useMemo(
    () => (form.ticketType === "gift" ? 0 : calculateTotalAmount(unitPriceValue, quantityValue)),
    [form.ticketType, quantityValue, unitPriceValue],
  );

  React.useEffect(() => {
    if (!open) {
      return;
    }

    setNow(new Date());

    let cancelled = false;
    async function loadTicketTiers() {
      try {
        const response = await fetch("/api/ticket-tiers");
        const result = (await response.json().catch(() => ({}))) as { data?: TicketTierOption[]; message?: string };
        if (!response.ok) {
          throw new Error(result.message ?? "Không thể tải hạng vé");
        }

        if (cancelled) {
          return;
        }

        const activeTiers = (result.data ?? []).filter((tier) => tier.isActive);
        setTicketTiers(activeTiers);
        if (activeTiers.length > 0) {
          setForm((prev) => {
            const matchedTier = activeTiers.find((tier) => tier.code === prev.class) ?? activeTiers[0];
            return {
              ...prev,
              class: matchedTier.code,
              money: prev.ticketType === "gift" ? "0" : String(matchedTier.effectivePrice),
            };
          });
        }
      } catch (error) {
        if (!cancelled) {
          toast.error(error instanceof Error ? error.message : "Không thể tải hạng vé");
        }
      }
    }

    void loadTicketTiers();
    return () => {
      cancelled = true;
    };
  }, [open]);

  const handleInputChange = React.useCallback(
    (key: FormKey) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
    },
    [],
  );

  const handleTicketClassChange = React.useCallback(
    (value: string) => {
      setForm((prev) => {
        const matchedTier = ticketTiers.find((tier) => tier.code === value);
        return {
          ...prev,
          class: value,
          money: prev.ticketType === "gift" ? "0" : String(matchedTier?.effectivePrice ?? prev.money),
        };
      });
    },
    [ticketTiers],
  );

  const handleTicketTypeChange = React.useCallback(
    (value: string) => {
      setForm((prev) => {
        const isGift = value === "gift";
        const matchedTier = ticketTiers.find((tier) => tier.code === prev.class);
        return {
          ...prev,
          ticketType: isGift ? "gift" : "paid",
          money: isGift ? "0" : String(matchedTier?.effectivePrice ?? prev.money),
        };
      });
    },
    [ticketTiers],
  );

  const handleGenderChange = React.useCallback((value: string) => {
    setForm((prev) => ({ ...prev, gender: value === "f" ? "f" : "m" }));
  }, []);

  const handleInvoiceChange = React.useCallback((checked: boolean | "indeterminate") => {
    setForm((prev) => ({ ...prev, exportVatInvoice: checked === true }));
  }, []);

  const resetDrawer = React.useCallback(() => {
    setForm(initialAddTicketForm);
    setSubmitting(false);
  }, []);

  const handleSubmit = React.useCallback(
    async (event: React.FormEvent) => {
      event.preventDefault();
      setSubmitting(true);

      try {
        const preparedSubmission = prepareOrderSubmission(form, now, unitPriceValue, totalAmountValue);
        const response = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(preparedSubmission.requestBody),
        });
        const data = await response.json().catch(() => ({}));

        if (!response.ok) {
          throw new Error(getOrderApiError(data));
        }

        if (form.exportVatInvoice) {
          try {
            await exportVatInvoicePdf({
              ...preparedSubmission.invoicePayload,
              orderCode: getFirstOrderCode(data),
            });
            toast.success("Xuất hóa đơn thành công");
          } catch (exportError) {
            toast.error(exportError instanceof Error ? exportError.message : "Xuất hóa đơn thất bại");
          }
        }

        toast.success("Thêm vé thành công");
        setOpen(false);
        resetDrawer();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Có lỗi xảy ra");
      } finally {
        setSubmitting(false);
      }
    },
    [form, now, resetDrawer, router, totalAmountValue, unitPriceValue],
  );

  return (
    <Drawer
      direction="right"
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetDrawer();
        }
      }}
    >
      <DrawerTrigger asChild>
        <SidebarMenuButton
          tooltip="Thêm vé"
          className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
        >
          <PlusCircleIcon />
          <span>Thêm vé</span>
        </SidebarMenuButton>
      </DrawerTrigger>

      <DrawerContent className="h-screen sm:ml-auto sm:max-w-[420px]">
        <DrawerHeader className="bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
          <DrawerTitle>Thêm vé</DrawerTitle>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="nice-scroll flex-1 overflow-y-auto px-4 pt-3 pb-4">
          <div className="grid gap-4">
            <section className="bg-card/60 space-y-3 rounded-xl border p-3">
              <h4 className="text-sm font-semibold">Thông tin khách hàng</h4>

              <div className="grid gap-2">
                <Label htmlFor="name">Họ tên</Label>
                <Input id="name" placeholder="Nhập họ tên" value={form.name} onChange={handleInputChange("name")} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Điện thoại</Label>
                <Input
                  id="phone"
                  placeholder="Nhập số điện thoại"
                  value={form.phone}
                  onChange={handleInputChange("phone")}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Nhập email"
                  value={form.email}
                  onChange={handleInputChange("email")}
                />
              </div>
            </section>

            <section className="bg-card/60 space-y-3 rounded-xl border p-3">
              <h4 className="text-sm font-semibold">Thông tin vé</h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="class">Hạng vé</Label>
                  <Select value={form.class} onValueChange={handleTicketClassChange}>
                    <SelectTrigger id="class">
                      <SelectValue placeholder="Chọn hạng vé" />
                    </SelectTrigger>
                    <SelectContent>
                      {ticketTiers.length > 0 ? (
                        ticketTiers.map((tier) => (
                          <SelectItem key={tier.id} value={tier.code}>
                            {tier.code}
                          </SelectItem>
                        ))
                      ) : (
                        <SelectItem value={form.class || "GOLD"}>{form.class || "GOLD"}</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="quantity">Số lượng vé</Label>
                  <Input
                    id="quantity"
                    inputMode="numeric"
                    value={form.quantity}
                    onChange={handleInputChange("quantity")}
                  />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ticketType">Loại vé</Label>
                <Select value={form.ticketType} onValueChange={handleTicketTypeChange}>
                  <SelectTrigger id="ticketType">
                    <SelectValue placeholder="Chọn loại vé" />
                  </SelectTrigger>
                  <SelectContent>
                    {ticketTypeOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="money">Giá tiền</Label>
                  <Input
                    id="money"
                    inputMode="numeric"
                    placeholder="0"
                    value={form.money}
                    onChange={handleInputChange("money")}
                    disabled={form.ticketType === "gift"}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="money_total">Thành tiền</Label>
                  <Input id="money_total" value={totalAmountValue.toLocaleString("en-GB")} readOnly />
                </div>
              </div>
            </section>

            <section className="bg-card/60 space-y-3 rounded-xl border p-3">
              <h4 className="text-sm font-semibold">Tùy chọn</h4>

              <div className="flex items-center gap-2">
                <Checkbox id="exportVatInvoice" checked={form.exportVatInvoice} onCheckedChange={handleInvoiceChange} />
                <Label htmlFor="exportVatInvoice">Xuất hóa đơn PDF</Label>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="gender">Giới tính</Label>
                <Select value={form.gender} onValueChange={handleGenderChange}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Chọn giới tính" />
                  </SelectTrigger>
                  <SelectContent>
                    {genderOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </section>
          </div>

          <DrawerFooter className="bg-background/95 sticky bottom-0 z-10 mt-4 border-t px-0 pt-4 backdrop-blur">
            <Button type="submit" disabled={submitting}>
              {submitting ? "Đang lưu..." : "Lưu vé"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" type="button">
                Đóng
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
