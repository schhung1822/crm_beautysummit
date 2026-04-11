/* eslint-disable complexity, max-lines */
"use client";

import * as React from "react";

import { Briefcase, Calendar, CheckCircle2, Mail, Phone, User2, Wallet } from "lucide-react";
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
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

import { channelSchema } from "./schema";

type Stats = {
  totalOrders: number;
  totalMoney: number;
  totalMoneyVAT: number;
};

type ViewerProps = {
  item: z.infer<typeof channelSchema>;
  stats: Stats;
  onRowUpdated?: (updated: z.infer<typeof channelSchema>, originalOrderCode: string) => void;
  triggerElement?: React.ReactElement;
};

function formatDateVN(value: unknown) {
  if (!value) return "—";

  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return String(value);

  return date.toLocaleString("vi-VN");
}

function formatGender(value?: string | null) {
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();

  if (normalized === "f" || normalized === "female" || normalized === "nữ" || normalized === "nu") return "Nữ";
  if (normalized === "m" || normalized === "male" || normalized === "nam") return "Nam";

  return value ?? "";
}

function formatMoney(value: unknown) {
  const numberValue = typeof value === "number" ? value : Number(String(value ?? 0).replaceAll(",", ""));
  if (!Number.isFinite(numberValue)) return "0";
  return numberValue.toLocaleString("vi-VN");
}

function StatPill({ label, value, sub = "VNĐ" }: { label: string; value: string; sub?: string }) {
  return (
    <div className="bg-card/60 rounded-2xl border px-3 py-2">
      <div className="text-muted-foreground text-[11px]">{label}</div>
      <div className="mt-0.5 flex items-baseline justify-between gap-2">
        <div className="text-base leading-none font-semibold tabular-nums">{value}</div>
        <div className="text-muted-foreground text-[11px]">{sub}</div>
      </div>
    </div>
  );
}

function Row({ icon, label, value }: { icon: React.ReactNode; label: string; value?: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-[11px]">{label}</div>
        <div className="text-sm font-medium">{value ?? "—"}</div>
      </div>
    </div>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card/60 rounded-2xl border p-3">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div className="grid gap-2.5">{children}</div>
    </div>
  );
}

export function TableCellViewer({ item, stats, onRowUpdated, triggerElement }: ViewerProps) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [isSaving, setIsSaving] = React.useState(false);
  const [form, setForm] = React.useState<z.infer<typeof channelSchema>>(item);

  const ticketClassOptions = ["GOLD", "RUBY", "VIP"];
  const paymentStatusOptions = ["paydone", "new", "cancelled", "refunded", "present"];
  const checkinStatusOptions = ["chưa checkin", "đã checkin"];
  const careerQuickOptions = ["Khác", "Chủ spa/ TMV/ Phòng khám", "Bác sĩ", "Dược sĩ", "Kỹ thuật viên", "Sale"];

  React.useEffect(() => {
    setForm(item);
  }, [item]);

  const normalizedMoney = Number(form.money) || 0;
  const computedVat = Number((normalizedMoney * 1.08).toFixed(2));

  const handleSave = React.useCallback(async () => {
    setIsSaving(true);

    try {
      const isCheckedIn = form.status_checkin === "đã checkin";
      const payload = channelSchema.parse({
        ...form,
        money: normalizedMoney,
        money_VAT: computedVat,
        status: form.status || "new",
        status_checkin: isCheckedIn ? "đã checkin" : "chưa checkin",
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

  const displayedItem = isEditing
    ? {
        ...form,
        money: normalizedMoney,
        money_VAT: computedVat,
      }
    : form;

  const createdAt = displayedItem.create_time ? formatDateVN(displayedItem.create_time) : "";
  const updatedAt = displayedItem.update_time ? formatDateVN(displayedItem.update_time) : "";
  const checkinAt = displayedItem.checkin_time ? formatDateVN(displayedItem.checkin_time) : "";

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
          <Button variant="link" className="text-foreground w-fit px-0 text-left">
            {displayedItem.ordercode}
          </Button>
        )}
      </DrawerTrigger>

      <DrawerContent className="h-screen sm:ml-auto sm:h-screen sm:max-w-[400px]">
        <DrawerHeader className="supports-backdrop-filter:bg-background/80 bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DrawerTitle className="truncate">Mã đơn: {displayedItem.ordercode}</DrawerTitle>
                <DrawerDescription className="truncate">
                  {displayedItem.class ? <>• {displayedItem.class}</> : null}
                </DrawerDescription>
              </div>

              {displayedItem.status ? (
                <Badge variant="secondary" className="shrink-0 rounded-full">
                  {displayedItem.status}
                </Badge>
              ) : null}
            </div>
          </div>
        </DrawerHeader>

        <div className="nice-scroll flex-1 overflow-y-auto px-4 py-4">
          <div className="grid gap-3">
            <Block title="Tổng quan">
              <div className="grid gap-2">
                <StatPill label="Tổng đơn" value={stats.totalOrders.toLocaleString("vi-VN")} sub="đơn" />
                <StatPill label="Tổng tiền" value={formatMoney(stats.totalMoney)} />
                <StatPill label="Tổng VAT" value={formatMoney(stats.totalMoneyVAT)} />
              </div>
            </Block>

            {isEditing ? (
              <Block title="Chỉnh sửa nhanh">
                <div className="grid gap-3">
                  <div className="grid gap-1.5">
                    <Label>Họ tên</Label>
                    <Input
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Số điện thoại</Label>
                    <Input
                      value={form.phone}
                      onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))}
                    />
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Giới tính</Label>
                      <Select
                        value={form.gender || ""}
                        onValueChange={(value) => setForm((prev) => ({ ...prev, gender: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="m">Nam</SelectItem>
                          <SelectItem value="f">Nữ</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="grid gap-1.5">
                      <Label>Hạng vé</Label>
                      <Select
                        value={form.class || ""}
                        onValueChange={(value) => setForm((prev) => ({ ...prev, class: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Chọn" />
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
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Trạng thái</Label>
                    <Select
                      value={form.status || ""}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn" />
                      </SelectTrigger>
                      <SelectContent>
                        {paymentStatusOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="grid gap-1.5">
                      <Label>Tiền</Label>
                      <Input
                        type="number"
                        value={Number.isFinite(Number(form.money)) ? Number(form.money) : 0}
                        onChange={(event) => setForm((prev) => ({ ...prev, money: Number(event.target.value) || 0 }))}
                      />
                    </div>
                    <div className="grid gap-1.5">
                      <Label>Tiền VAT</Label>
                      <Input value={computedVat} readOnly />
                    </div>
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Trạng thái check-in</Label>
                    <Select
                      value={form.status_checkin || ""}
                      onValueChange={(value) => setForm((prev) => ({ ...prev, status_checkin: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Chọn" />
                      </SelectTrigger>
                      <SelectContent>
                        {checkinStatusOptions.map((option) => (
                          <SelectItem key={option} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid gap-1.5">
                    <Label>Nghề nghiệp</Label>
                    <Input
                      list="career-quick-options"
                      value={form.career}
                      onChange={(event) => setForm((prev) => ({ ...prev, career: event.target.value }))}
                    />
                    <datalist id="career-quick-options">
                      {careerQuickOptions.map((option) => (
                        <option key={option} value={option} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </Block>
            ) : null}

            <Block title="Khách hàng">
              <Row icon={<User2 className="h-4 w-4" />} label="Họ tên" value={displayedItem.name} />
              <Row icon={<Phone className="h-4 w-4" />} label="Số điện thoại" value={displayedItem.phone || "—"} />
              <Row icon={<Mail className="h-4 w-4" />} label="Email" value={displayedItem.email || "—"} />
            </Block>

            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full">
                <Calendar className="mr-1 h-3.5 w-3.5" />
                {createdAt || "—"}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                <Calendar className="mr-1 h-3.5 w-3.5" />
                {updatedAt || "—"}
              </Badge>
              {displayedItem.gender ? (
                <Badge variant="outline" className="rounded-full">
                  {formatGender(displayedItem.gender)}
                </Badge>
              ) : null}
            </div>

            <Block title="Thanh toán">
              <Row icon={<Wallet className="h-4 w-4" />} label="Trạng thái" value={displayedItem.status || "—"} />
              <Separator />
              <div className="grid grid-cols-1 gap-2">
                <StatPill label="Tiền" value={formatMoney(displayedItem.money || 0)} />
                <StatPill label="Tiền (VAT)" value={formatMoney(displayedItem.money_VAT || 0)} />
              </div>
            </Block>

            <Block title="Check-in">
              <Row
                icon={<CheckCircle2 className="h-4 w-4" />}
                label="Trạng thái"
                value={displayedItem.status_checkin || "—"}
              />
              <Row icon={<Calendar className="h-4 w-4" />} label="Ngày check-in" value={checkinAt || "—"} />
              <Row icon={<Briefcase className="h-4 w-4" />} label="Nghề nghiệp" value={displayedItem.career || "—"} />
            </Block>
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
              <Button className="w-full rounded-xl" onClick={handleSave} disabled={isSaving}>
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
