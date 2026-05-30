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
import { formatGender, getInitials } from "@/lib/utils";

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
        throw new Error(result.message ?? "Không thể cập nhật khách hàng");
      }

      onUpdated?.(result.data);
      setIsEditing(false);
      setForm(createEditForm(result.data));
      toast.success("Đã cập nhật thông tin khách hàng");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật khách hàng");
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

      <DrawerContent className="h-screen sm:ml-auto sm:max-w-[400px]">
        <DrawerHeader className="bg-background/95 sticky top-0 z-10 border-b backdrop-blur">
          <div className="flex items-center gap-4">
            <Avatar className="bg-muted h-14 w-14 shrink-0 rounded-xl border shadow-sm">
              <AvatarImage src="/avatars/nghecontent.jpg" alt={previewItem.name} className="rounded-2xl object-cover" />
              <AvatarFallback className="rounded-xl bg-gradient-to-br from-cyan-500 to-blue-500 text-lg font-black text-white">
                {getInitials(previewItem.name)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <DrawerTitle className="truncate text-base">{getDisplayValue(previewItem.name)}</DrawerTitle>
              </div>

              <DrawerDescription className="mt-1 flex flex-col gap-1 truncate text-xs">
                <span>Mã khách hàng: {getDisplayValue(previewItem.customer_ID)}</span>
              </DrawerDescription>
            </div>
          </div>

          <div className="hidden">
            <StatCard
              label="Điện thoại"
              value={getDisplayValue(previewItem.phone)}
              icon={<Smartphone className="size-3.5" />}
            />
            <StatCard
              label="Ngày tạo"
              value={formatDate(previewItem.create_time)}
              icon={<ShieldCheck className="size-3.5" />}
            />
          </div>
        </DrawerHeader>

        <div className="nice-scroll flex-1 gap-4 overflow-y-auto px-4 py-4">
          {isEditing ? (
            <SectionCard title="Chỉnh sửa nhanh">
              <div className="grid gap-4 md:grid-cols-2">
                <div className="grid gap-2">
                  <Label htmlFor="customer-name">Họ tên</Label>
                  <Input
                    id="customer-name"
                    value={form.name}
                    onChange={handleChange("name")}
                    className="h-10 rounded-lg bg-white dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-phone">Số điện thoại</Label>
                  <Input
                    id="customer-phone"
                    value={form.phone}
                    onChange={handleChange("phone")}
                    className="h-10 rounded-lg bg-white dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-email">Email</Label>
                  <Input
                    id="customer-email"
                    value={form.email}
                    onChange={handleChange("email")}
                    className="h-10 rounded-lg bg-white dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="customer-gender">Giới tính</Label>
                  <select
                    id="customer-gender"
                    value={form.gender}
                    onChange={handleChange("gender")}
                    className="border-input bg-background ring-offset-background focus-visible:ring-ring h-10 w-full min-w-0 rounded-lg border px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-offset-2"
                  >
                    <option value="">Chưa chọn</option>
                    <option value="m">Nam</option>
                    <option value="f">Nữ</option>
                    <option value="Khác">Khác</option>
                  </select>
                </div>
                <div className="grid gap-2 md:col-span-2">
                  <Label htmlFor="customer-career">Ngành nghề</Label>
                  <Input
                    id="customer-career"
                    value={form.career}
                    onChange={handleChange("career")}
                    className="h-10 rounded-lg bg-white dark:border-slate-800 dark:bg-slate-900"
                  />
                </div>
              </div>
            </SectionCard>
          ) : null}

          <SectionCard title="Thông tin cơ bản">
            <div className="grid gap-2.5 ">
              <StatCard
                label="Số điện thoại"
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
                label="Giới tính"
                value={formatGender(previewItem.gender)}
                icon={<User2 className="size-3.5" />}
              />
              <StatCard
                label="Ngành nghề"
                value={getDisplayValue(previewItem.career)}
                icon={<UserPlus className="size-3.5" />}
              />
            </div>
          </SectionCard>

          <SectionCard title="Dữ liệu theo dõi">
            <div className="grid gap-2.5">
              <StatCard
                label="User IP"
                value={getDisplayValue(previewItem.user_ip)}
                icon={<Globe className="size-3.5" />}
              />
              <StatCard
                label="User Agent"
                value={getDisplayValue(previewItem.user_agent)}
                icon={<Globe className="size-3.5" />}
                className="whitespace-wrap"
              />
            </div>
          </SectionCard>
        </div>

        <DrawerFooter className="bg-background/95 sticky bottom-0 z-10 border-t backdrop-blur">
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
                Hủy
              </Button>
              <Button
                className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200"
                onClick={() => void handleSave()}
                disabled={saving}
              >
                {saving ? "Đang lưu..." : "Lưu thay đổi"}
              </Button>
            </div>
          ) : (
            <div className="grid w-full grid-cols-2 gap-2">
              <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
                <Pencil className="mr-2 size-4" />
                Chỉnh sửa
              </Button>
              <Link href={`/orders/${item.customer_ID}`} className="w-full">
                <Button className="w-full bg-slate-900 text-white hover:bg-slate-800 dark:bg-slate-50 dark:text-slate-900 dark:hover:bg-slate-200">
                  Xem đơn hàng
                </Button>
              </Link>
            </div>
          )}

          <DrawerClose asChild>
            <Button variant="outline">Đóng</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
