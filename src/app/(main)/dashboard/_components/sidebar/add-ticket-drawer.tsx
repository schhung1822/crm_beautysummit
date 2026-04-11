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
  calculateMoneyVat,
  exportVatInvoicePdf,
  getFirstOrderCode,
  getOrderApiError,
  initialAddTicketForm,
  parseMoneyInput,
  prepareOrderSubmission,
} from "./add-ticket-drawer.utils";

const ticketClassOptions = ["GOLD", "RUBY", "VIP"] as const;
const ticketTypeOptions = [
  { label: "Ve mua", value: "paid" },
  { label: "Ve tang", value: "gift" },
] as const;
const genderOptions = [
  { label: "Nam", value: "m" },
  { label: "Nu", value: "f" },
] as const;

type FormKey = keyof typeof initialAddTicketForm;

export function AddTicketDrawer() {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [submitting, setSubmitting] = React.useState(false);
  const [form, setForm] = React.useState(initialAddTicketForm);
  const [now, setNow] = React.useState(() => new Date());

  const moneyValue = React.useMemo(() => parseMoneyInput(form.money), [form.money]);
  const moneyVatValue = React.useMemo(() => calculateMoneyVat(moneyValue), [moneyValue]);

  React.useEffect(() => {
    if (open) {
      setNow(new Date());
    }
  }, [open]);

  const handleInputChange = React.useCallback(
    (key: FormKey) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
    },
    [],
  );

  const handleTicketClassChange = React.useCallback((value: string) => {
    setForm((prev) => ({ ...prev, class: value }));
  }, []);

  const handleTicketTypeChange = React.useCallback((value: string) => {
    setForm((prev) => ({
      ...prev,
      ticketType: value === "gift" ? "gift" : "paid",
    }));
  }, []);

  const handleGenderChange = React.useCallback((value: string) => {
    setForm((prev) => ({ ...prev, gender: value === "f" ? "f" : "m" }));
  }, []);

  const handleVatInvoiceChange = React.useCallback((checked: boolean | "indeterminate") => {
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
        const preparedSubmission = prepareOrderSubmission(form, now, moneyValue, moneyVatValue);
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
            toast.success("Xuat hoa don thanh cong");
          } catch (exportError) {
            toast.error(exportError instanceof Error ? exportError.message : "Xuat hoa don that bai");
          }
        }

        toast.success("Them ve thanh cong");
        setOpen(false);
        resetDrawer();
        router.refresh();
      } catch (error) {
        toast.error(error instanceof Error ? error.message : "Co loi xay ra");
      } finally {
        setSubmitting(false);
      }
    },
    [form, moneyValue, moneyVatValue, now, resetDrawer, router],
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
          tooltip="Them ve"
          className="bg-primary text-primary-foreground hover:bg-primary/90 hover:text-primary-foreground active:bg-primary/90 active:text-primary-foreground min-w-8 duration-200 ease-linear"
        >
          <PlusCircleIcon />
          <span>Them ve</span>
        </SidebarMenuButton>
      </DrawerTrigger>

      <DrawerContent className="h-screen sm:ml-auto sm:max-w-[420px]">
        <DrawerHeader className="bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
          <DrawerTitle>Them ve</DrawerTitle>
        </DrawerHeader>

        <form onSubmit={handleSubmit} className="nice-scroll flex-1 overflow-y-auto px-4 pb-4">
          <div className="grid gap-4 py-1">
            <section className="bg-card/60 space-y-3 rounded-xl border p-3">
              <h4 className="text-sm font-semibold">Thong tin khach hang</h4>

              <div className="grid gap-2">
                <Label htmlFor="name">Ho ten</Label>
                <Input id="name" placeholder="Nhap ho ten" value={form.name} onChange={handleInputChange("name")} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="phone">Dien thoai</Label>
                <Input
                  id="phone"
                  placeholder="Nhap so dien thoai"
                  value={form.phone}
                  onChange={handleInputChange("phone")}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Nhap email"
                  value={form.email}
                  onChange={handleInputChange("email")}
                />
              </div>
            </section>

            <section className="bg-card/60 space-y-3 rounded-xl border p-3">
              <h4 className="text-sm font-semibold">Thong tin ve</h4>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="class">Hang ve</Label>
                  <Select value={form.class} onValueChange={handleTicketClassChange}>
                    <SelectTrigger id="class">
                      <SelectValue placeholder="Chon hang ve" />
                    </SelectTrigger>
                    <SelectContent>
                      {ticketClassOptions.map((option) => (
                        <SelectItem key={option} value={option}>
                          {option}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="quantity">So luong ve</Label>
                  <Input
                    id="quantity"
                    inputMode="numeric"
                    value={form.quantity}
                    onChange={handleInputChange("quantity")}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="grid gap-2">
                  <Label htmlFor="money">Thanh tien</Label>
                  <Input
                    id="money"
                    inputMode="numeric"
                    placeholder="0"
                    value={form.money}
                    onChange={handleInputChange("money")}
                  />
                </div>

                <div className="grid gap-2">
                  <Label htmlFor="money_VAT">Thanh tien (VAT)</Label>
                  <Input id="money_VAT" value={moneyVatValue.toLocaleString("vi-VN")} readOnly />
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ticketType">Loai ve</Label>
                <Select value={form.ticketType} onValueChange={handleTicketTypeChange}>
                  <SelectTrigger id="ticketType">
                    <SelectValue placeholder="Chon loai ve" />
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
            </section>

            <section className="bg-card/60 space-y-3 rounded-xl border p-3">
              <h4 className="text-sm font-semibold">Tuy chon</h4>

              <div className="flex items-center gap-2">
                <Checkbox
                  id="exportVatInvoice"
                  checked={form.exportVatInvoice}
                  onCheckedChange={handleVatInvoiceChange}
                />
                <Label htmlFor="exportVatInvoice">Xuat hoa don VAT (PDF)</Label>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="gender">Gioi tinh</Label>
                <Select value={form.gender} onValueChange={handleGenderChange}>
                  <SelectTrigger id="gender">
                    <SelectValue placeholder="Chon gioi tinh" />
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
              {submitting ? "Dang luu..." : "Luu ve"}
            </Button>
            <DrawerClose asChild>
              <Button variant="outline" type="button">
                Dong
              </Button>
            </DrawerClose>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
  );
}
