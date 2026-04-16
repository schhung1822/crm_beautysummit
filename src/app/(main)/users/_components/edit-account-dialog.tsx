"use client";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

import { StatCard } from "../../customers/_components/customer-detail-blocks";

import { formatDate, type AccountEditForm } from "./account-detail-utils";
import type { AccountUser } from "./schema";

export function EditAccountDialog({
  open,
  item,
  form,
  saving,
  onOpenChange,
  onInputChange,
  onSelectChange,
  onSave,
}: {
  open: boolean;
  item: AccountUser;
  form: AccountEditForm;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onInputChange: (key: keyof AccountEditForm) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (key: keyof AccountEditForm, value: string) => void;
  onSave: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="overflow-hidden p-0 sm:max-w-[760px]">
        <DialogHeader className="border-b border-slate-200 bg-gradient-to-r from-white to-slate-50 px-6 py-5">
          <DialogTitle>Cập nhật tài khoản</DialogTitle>
          <DialogDescription>Chỉnh sửa trực tiếp dữ liệu bảng user.</DialogDescription>
        </DialogHeader>

        <div className="max-h-[75vh] overflow-y-auto px-6 py-5">
          <div className="mb-5 grid gap-3 md:grid-cols-3">
            <StatCard label="ID" value={String(item.id)} />
            <StatCard label="User ID" value={item.user_id || "--"} />
            <StatCard label="Đăng nhập cuối" value={formatDate(item.last_login)} />
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="account-name">Họ tên</Label>
              <Input
                id="account-name"
                value={form.name}
                onChange={onInputChange("name")}
                className="h-10 rounded-lg bg-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account-username">Username</Label>
              <Input
                id="account-username"
                value={form.username}
                onChange={onInputChange("username")}
                autoComplete="new-username"
                className="h-10 rounded-lg bg-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account-email">Email</Label>
              <Input
                id="account-email"
                value={form.email}
                onChange={onInputChange("email")}
                className="h-10 rounded-lg bg-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account-phone">Điện thoại</Label>
              <Input
                id="account-phone"
                value={form.phone}
                onChange={onInputChange("phone")}
                className="h-10 rounded-lg bg-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account-zid">Zalo ID</Label>
              <Input
                id="account-zid"
                value={form.zid}
                onChange={onInputChange("zid")}
                className="h-10 rounded-lg bg-white"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="account-avatar">Avatar URL</Label>
              <Input
                id="account-avatar"
                value={form.avatar}
                onChange={onInputChange("avatar")}
                className="h-10 rounded-lg bg-white"
              />
            </div>
            <div className="grid gap-2">
              <Label>Vai trò</Label>
              <Select value={form.role} onValueChange={(value) => onSelectChange("role", value)}>
                <SelectTrigger className="h-10 rounded-lg bg-white">
                  <SelectValue placeholder="Chọn vai trò" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="staff">user</SelectItem>
                  <SelectItem value="admin">admin</SelectItem>
                  <SelectItem value="staff">staff</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label>Trạng thái</Label>
              <Select value={form.status} onValueChange={(value) => onSelectChange("status", value)}>
                <SelectTrigger className="h-10 rounded-lg bg-white">
                  <SelectValue placeholder="Chọn trạng thái" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">active</SelectItem>
                  <SelectItem value="inactive">inactive</SelectItem>
                  <SelectItem value="blocked">blocked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        <Separator className="bg-slate-200" />

        <DialogFooter className="px-6 py-4">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button onClick={onSave} disabled={saving} className="bg-slate-900 text-white hover:bg-slate-800">
            {saving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
