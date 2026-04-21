"use client";

import * as React from "react";

import { Pencil, ShieldCheck, User2 } from "lucide-react";
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
import { useIsMobile } from "@/hooks/use-mobile";
import { getInitials } from "@/lib/utils";

import { StatCard } from "../../customers/_components/customer-detail-blocks";

import { createEditForm, formatDate, getDisplayValue, type AccountEditForm } from "./account-detail-utils";
import { AccountEditSection, AccountInfoSection } from "./account-drawer-sections";
import type { AccountUser } from "./schema";

function buildPreviewItem(item: AccountUser, form: AccountEditForm): AccountUser {
  return {
    ...item,
    username: form.username,
    email: form.email,
    zid: form.zid,
    phone: form.phone,
    name: form.name,
    avatar: form.avatar,
    role: form.role,
    status: form.status,
  };
}

export function TableCellViewer({
  item,
  onUpdated,
  triggerElement,
}: {
  item: AccountUser;
  onUpdated?: (updated: AccountUser) => void;
  triggerElement?: React.ReactElement;
}) {
  const isMobile = useIsMobile();
  const [open, setOpen] = React.useState(false);
  const [isEditing, setIsEditing] = React.useState(false);
  const [saving, setSaving] = React.useState(false);
  const [form, setForm] = React.useState<AccountEditForm>(() => createEditForm(item));

  React.useEffect(() => {
    setForm(createEditForm(item));
  }, [item]);

  const previewItem = React.useMemo(() => buildPreviewItem(item, form), [form, item]);

  const handleInputChange = React.useCallback(
    (key: keyof AccountEditForm) => (event: React.ChangeEvent<HTMLInputElement>) => {
      setForm((prev) => ({ ...prev, [key]: event.target.value }));
    },
    [],
  );

  const handleSelectChange = React.useCallback((key: keyof AccountEditForm, value: string) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  const resetEditor = React.useCallback(() => {
    setIsEditing(false);
    setForm(createEditForm(item));
  }, [item]);

  const handleSave = React.useCallback(async () => {
    setSaving(true);
    try {
      const response = await fetch("/api/admin-users", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          ...form,
        }),
      });

      const result = (await response.json().catch(() => ({}))) as { data?: AccountUser; message?: string };
      if (!response.ok || !result.data) {
        throw new Error(result.message ?? "Không thể cập nhật tài khoản");
      }

      onUpdated?.(result.data);
      setIsEditing(false);
      setForm(createEditForm(result.data));
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Không thể cập nhật tài khoản");
    } finally {
      setSaving(false);
    }
  }, [form, item.id, onUpdated]);

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        setOpen(nextOpen);
        if (!nextOpen) {
          resetEditor();
        }
      }}
      direction={isMobile ? "bottom" : "right"}
    >
      <DrawerTrigger asChild>
        {triggerElement ?? (
          <Button variant="link" className="text-foreground h-auto w-fit px-0 text-left">
            {item.name || item.username}
          </Button>
        )}
      </DrawerTrigger>

      <DrawerContent className="h-screen sm:ml-auto sm:h-screen sm:max-w-[620px]">
        <DrawerHeader className="gap-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-br from-white via-slate-50 to-indigo-50/50 dark:from-slate-950 dark:via-slate-900 dark:to-indigo-900/20 pb-5">
          <div className="flex items-start gap-4">
            <Avatar className="h-14 w-14 shrink-0 rounded-2xl border border-white/90 shadow-[0_14px_28px_rgba(15,23,42,0.1)] ring-2 ring-indigo-100">
              <AvatarImage
                src={previewItem.avatar || undefined}
                alt={previewItem.name || previewItem.username}
                className="rounded-2xl object-cover"
              />
              <AvatarFallback className="rounded-2xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                {getInitials(previewItem.name || previewItem.username)}
              </AvatarFallback>
            </Avatar>

            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <DrawerTitle className="truncate text-xl">
                  {getDisplayValue(previewItem.name || previewItem.username)}
                </DrawerTitle>
                <Badge
                  variant="outline"
                  className="rounded-full border-indigo-200 dark:border-indigo-900/50 bg-indigo-50 dark:bg-indigo-900/30 px-2.5 py-1 text-[11px] font-semibold text-indigo-700 dark:text-indigo-300"
                >
                  {getDisplayValue(previewItem.role)}
                </Badge>
              </div>

              <DrawerDescription className="mt-1 truncate text-xs tracking-[0.18em] text-slate-500 uppercase">
                {getDisplayValue(previewItem.username)}
              </DrawerDescription>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <StatCard
              label="Trạng thái"
              value={getDisplayValue(previewItem.status)}
              icon={<ShieldCheck className="size-3.5" />}
            />
            <StatCard
              label="Đăng nhập cuối"
              value={formatDate(previewItem.last_login)}
              icon={<User2 className="size-3.5" />}
            />
          </div>
        </DrawerHeader>

        <div className="nice-scroll flex max-h-[80vh] flex-col gap-4 overflow-y-auto bg-slate-50/60 dark:bg-slate-950 px-4 py-4 text-sm sm:max-h-[82vh]">
          <AccountEditSection
            visible={isEditing}
            form={form}
            onInputChange={handleInputChange}
            onSelectChange={handleSelectChange}
          />
          <AccountInfoSection item={previewItem} />
        </div>

        <DrawerFooter className="border-t border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-950/95">
          {isEditing ? (
            <div className="grid w-full grid-cols-2 gap-2">
              <Button variant="outline" className="w-full" onClick={resetEditor} disabled={saving}>
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
            <Button variant="outline" className="w-full" onClick={() => setIsEditing(true)}>
              <Pencil className="mr-2 size-4" />
              Chỉnh sửa
            </Button>
          )}

          <DrawerClose asChild>
            <Button variant="outline">Đóng</Button>
          </DrawerClose>
        </DrawerFooter>
      </DrawerContent>
    </Drawer>
  );
}
