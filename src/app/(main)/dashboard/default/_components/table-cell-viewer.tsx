"use client";

import * as React from "react";

import { Calendar, Mail, Phone, User2, Briefcase, CheckCircle2, Wallet } from "lucide-react";
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
import { Separator } from "@/components/ui/separator";
import { useIsMobile } from "@/hooks/use-mobile";

import { channelSchema } from "./schema";

type Stats = {
  totalOrders: number;
  totalMoney: number;
  totalMoneyVAT: number;
};

function formatDateVN(v: unknown) {
  if (!v) return "—";
  const d = v instanceof Date ? v : new Date(String(v));
  if (Number.isNaN(d.getTime())) return String(v);
  return d.toLocaleDateString("en-GB");
}
function formatGender(value?: string | null) {
  const v = String(value ?? "").trim().toLowerCase();
  if (!v) return "Khác";
  if (v === "f" || v === "female" || v === "nữ" || v === "nu") return "Nữ";
  if (v === "m" || v === "male" || v === "nam") return "Nam";
  return "Khác";
}
function money(v: unknown) {
  const n = typeof v === "number" ? v : Number(String(v ?? 0).replaceAll(",", ""));
  if (!Number.isFinite(n)) return "0";
  return n.toLocaleString("en-GB");
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

// eslint-disable-next-line complexity
export function TableCellViewer({ item }: { item: z.infer<typeof channelSchema>; stats: Stats }) {
  const isMobile = useIsMobile();

  const createdAt = item.create_time ? formatDateVN(item.create_time) : "";
  const updatedAt = item.update_time ? formatDateVN(item.update_time) : "";
  const checkinAt = item.checkin_time ? formatDateVN(item.checkin_time) : "";

  const moneyValue = money(item.money || 0);
  const moneyVatValue = money(item.money_VAT || 0);

  return (
    <Drawer direction={isMobile ? "bottom" : "right"}>
      <DrawerTrigger asChild>
        <Button variant="link" className="text-foreground w-fit px-0 text-left">
          {item.ordercode}
        </Button>
      </DrawerTrigger>

      {/* ✅ max width 400px, full height on desktop */}
      <DrawerContent className="h-[100vh] sm:ml-auto sm:h-[100vh] sm:max-w-[400px]">
        {/* HEADER - sticky */}
        <DrawerHeader className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky top-0 z-10 border-b backdrop-blur">
          <div className="min-w-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <DrawerTitle className="truncate">Mã đơn: {item.ordercode}</DrawerTitle>
                <DrawerDescription className="truncate">{item.class ? <>• {item.class}</> : null}</DrawerDescription>
              </div>

              {item.status ? (
                <Badge variant="secondary" className="shrink-0 rounded-full">
                  {String(item.status)}
                </Badge>
              ) : null}
            </div>
          </div>
        </DrawerHeader>

        {/* BODY - scroll */}
        <div className="flex-1 overflow-y-auto px-4 py-4">
          {/* KPI */}
          <div className="grid gap-3">
            <Block title="Khách hàng">
              <Row icon={<User2 className="h-4 w-4" />} label="Họ tên" value={item.name} />
              <Row icon={<Phone className="h-4 w-4" />} label="Số điện thoại" value={item.phone} />
              <Row icon={<Mail className="h-4 w-4" />} label="Email" value={item.email} />
            </Block>

            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline" className="rounded-full">
                <Calendar className="mr-1 h-3.5 w-3.5" />
                {createdAt}
              </Badge>
              <Badge variant="outline" className="rounded-full">
                <Calendar className="mr-1 h-3.5 w-3.5" />
                {updatedAt}
              </Badge>
              {item.gender ? (
                <Badge variant="outline" className="rounded-full">
                  {formatGender(item.gender)}
                </Badge>
              ) : null}
            </div>

            <Block title="Thanh toán">
              <Row icon={<Wallet className="h-4 w-4" />} label="Trạng thái" value={item.status} />
              <Separator />
              <div className="grid grid-cols-1 gap-2">
                <StatPill label="Tiền" value={moneyValue} />
                <StatPill label="Tiền (VAT)" value={moneyVatValue} />
              </div>
            </Block>

            <Block title="Check-in">
              <Row icon={<CheckCircle2 className="h-4 w-4" />} label="Trạng thái" value={item.status_checkin} />
              <Row icon={<Calendar className="h-4 w-4" />} label="Ngày check-in" value={checkinAt || ""} />
              <Row icon={<Briefcase className="h-4 w-4" />} label="Nghề nghiệp" value={item.career} />
            </Block>
          </div>
        </div>

        {/* FOOTER - sticky */}
        <DrawerFooter className="bg-background/95 supports-[backdrop-filter]:bg-background/80 sticky bottom-0 z-10 border-t backdrop-blur">
          {/* <Link href={`/kenh/${item.id_kenh}`} className="w-full">
            <Button className="w-full rounded-xl">Xem chi tiết kênh</Button>
          </Link> */}

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
