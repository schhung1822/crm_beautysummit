"use client";

import * as React from "react";

import Link from "next/link";

import { Globe, Mail, Pencil, ShieldCheck, Smartphone, User2, UserPlus } from "lucide-react";
import { toast } from "sonner";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { getInitials } from "@/lib/utils";

import { SectionCard, StatCard } from "./customer-detail-blocks";
import { createEditForm, formatDate, getDisplayValue, type CustomerEditForm } from "./customer-detail-utils";
import type { Users } from "./schema";

function buildPreviewItem(item: Users, form: CustomerEditForm): Users {
  return {
    ...item,
    name: form.name,
    gender: form.gender,
    phone: form.phone,
    email: form.email,
    career: form.career,
  };
}

export function TableCellViewer({
  item,
  onUpdated,
  triggerElement,
}: {
  item: Users;
  onUpdated?: (updated: Users) => void;
  triggerElement?: React.ReactElement;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<CustomerEditForm>(() => createEditForm(item));

  React.useEffect(() => {
    setForm(createEditForm(item));
  }, [item]);

  const previewItem = React.useMemo(() => buildPreviewItem(item, form), [form, item]);

  const handleChange = React.useCallback(
    (key: keyof CustomerEditForm) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
    },
    [],
  );

  const handleSave = React.useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/customers", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId: item.customer_ID,
          ...form,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as { data?: Users; message?: string };
      if (!response.ok || !result.data) {
        throw new Error(result.message ?? "Khong the cap nhat khach hang");
      }

      onUpdated?.(result.data);
      setIsEditing(false);
      setForm(createEditForm(result.data));
      toast.success("Da cap nhat thong tin khach hang");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Khong the cap nhat khach hang");
    } finally {
      setSaving(false);
    }
  }, [form, item.customer_ID, onUpdated]);

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          setIsEditing(false);
          setForm(createEditForm(item));
        }
      }}
      direction={isMobile ? "bottom" : "right"}
    >
      <DrawerTrigger asChild>
        {triggerElement ?? (
          <Button variant="link" className="text-foreground h-auto w-fit px-0 text-left">
            {item.name}
          </Button>
        )}
      </DrawerTrigger>

      <DrawerContent className="h-screen sm:ml-auto sm:h-screen sm:max-w-[560px]">
        <DrawerHeader className="gap-4 border-b border-slate-200 bg-gradient-to-br from-white via-slate-50 to-sky-50/50 pb-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 shrink-0 rounded-2xl border border-white/90 shadow-[0_14px_28px_rgba(15,23,42,0.1)] ring-2 ring-sky-100">
              <AvatarImage src="/avatars/nghecontent.jpg" alt={previewItem.name} className="rounded-2xl object-cover" />
              <AvatarFallback className="rounded-2xl bg-slate-200 text-slate-700">
                {getInitials(previewItem.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DrawerTitle className="truncate text-xl">{getDisplayValue(previewItem.name)}</DrawerTitle>
                <Badge
                  variant="outline"
                  className="rounded-full border-sky-200 bg-sky-50 px-2.5 py-1 text-[11px] font-semibold text-sky-700"
                >
                  Ho so khach hang
                </Badge>
              </div>

              <DrawerDescription className="mt-1 truncate text-xs tracking-[0.18em] text-slate-500 uppercase">
                {getDisplayValue(previewItem.customer_ID)}
              </DrawerDescription>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label="Dien thoai"
              value={getDisplayValue(previewItem.phone)}
              icon={<Smartphone className="size-3.5" />}
            />
            <StatCard
              label="Ngay tao"
              value={formatDate(previewItem.create_time)}
              icon={<ShieldCheck className="size-3.5" />}
            />
          </div>
        </DrawerHeader>

        <div className="nice-scroll flex max-h-[80vh] flex-col gap-4 overflow-y-auto bg-slate-50/60 px-4 py-4 text-sm sm:max-h-[82vh]">
          {isEditing ? (
            <SectionCard
              title="Chinh sua nhanh"
              description="Cap nhat customer va dong bo lai thong tin lien he chinh sang orders cung customer_id."
            >
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="customer-name">Ho ten</Label>
                  <Input
                    id="customer-name"
                    value={form.name}
                    onChange={handleChange("name")}
                    className="h-10 rounded-lg bg-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-phone">Dien thoai</Label>
                  <Input
                    id="customer-phone"
                    value={form.phone}
                    onChange={handleChange("phone")}
                    className="h-10 rounded-lg bg-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-email">Email</Label>
                  <Input
                    id="customer-email"
                    value={form.email}
                    onChange={handleChange("email")}
                    className="h-10 rounded-lg bg-white"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-gender">Gioi tinh</Label>
                  <select
                    id="customer-gender"
                    value={form.gender}
                    onChange={handleChange("gender")}
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  >
                    <option value="">Chua chon</option>
                    <option value="Nam">Nam</option>
                    <option value="Nu">Nu</option>
                    <option value="Khac">Khac</option>
                  </select>
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="customer-career">Nghe nghiep</Label>
                  <Input
                    id="customer-career"
                    value={form.career}
                    onChange={handleChange("career")}
                    className="h-10 rounded-lg bg-white"
                  />
                </div>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="Thong tin co ban" description="Thong tin lien he va nhan dien chinh cua bang customer.">
            <div className="grid gap-3 md:grid-cols-2">
              <StatCard
                label="Dien thoai"
                value={getDisplayValue(previewItem.phone)}
                icon={<Smartphone className="size-3.5" />}
              />
              <StatCard
                label="Email"
                value={getDisplayValue(previewItem.email)}
                icon={<Mail className="size-3.5" />}
                valueClassName="truncate whitespace-nowrap overflow-hidden"
              />
              <StatCard
                label="Gioi tinh"
                value={getDisplayValue(previewItem.gender)}
                icon={<User2 className="size-3.5" />}
              />
              <StatCard
                label="Nghe nghiep"
                value={getDisplayValue(previewItem.career)}
                icon={<UserPlus className="size-3.5" />}
              />
            </div>
          </SectionCard>

          <SectionCard
            title="Du lieu theo doi"
            description="Thong tin tracking phuc vu attribution, cham soc khach hang va phan tich hanh vi."
          >
            <div className="grid gap-3">
              <StatCard
                label="User IP"
                value={getDisplayValue(previewItem.user_ip)}
                icon={<Globe className="size-3.5" />}
              />
              <StatCard
                label="User Agent"
                value={getDisplayValue(previewItem.user_agent)}
                icon={<Globe className="size-3.5" />}
              />
            </div>
          </SectionCard>
        </div>

        <DrawerFooter className="border-t border-slate-200 bg-white/95">
          {isEditing ? (
            <div className="grid w-full grid-cols-2 gap-2">
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  setIsEditing(false);
                  setForm(createEditForm(item));
                }}
                disabled={saving}
              >
                Huy
              </Button>
              <Button
                className="w-full bg-slate-900 text-white hover:bg-slate-800"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? "Dang luu..." : "Luu thay doi"}
              </Button>
            </div>
          ) : (
            <div className="grid w-full grid-cols-2 gap-2">
              <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 size-4" />
                Chinh sua
              </Button>
              <Link href={`/orders/${item.customer_ID}`} className="w-full">
                <Button className="w-full bg-slate-900 text-white hover:bg-slate-800">Xem don hang</Button>
              </Link>
            </div>
          )}

          <DrawerClose asChild>
            <Button variant="outline">Dong</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
