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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";

import type { Channel } from "./schema";

type EditOrderDialogProps = {
  open: boolean;
  form: Channel | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (updater: (prev: Channel | null) => Channel | null) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function EditOrderDialog({
  open,
  form,
  isSaving,
  onOpenChange,
  onChange,
  onCancel,
  onSave,
}: EditOrderDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa đơn hàng</DialogTitle>
          <DialogDescription>Cập nhật thông tin bản ghi đã chọn</DialogDescription>
        </DialogHeader>

        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Mã đơn</Label>
              <Input
                value={form.ordercode}
                onChange={(event) => onChange((prev) => (prev ? { ...prev, ordercode: event.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Họ tên</Label>
              <Input
                value={form.name}
                onChange={(event) => onChange((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Số điện thoại</Label>
              <Input
                value={form.phone}
                onChange={(event) => onChange((prev) => (prev ? { ...prev, phone: event.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(event) => onChange((prev) => (prev ? { ...prev, email: event.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Hạng vé</Label>
              <Input
                value={form.class}
                onChange={(event) => onChange((prev) => (prev ? { ...prev, class: event.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tiền</Label>
              <Input
                type="number"
                value={form.money}
                onChange={(event) =>
                  onChange((prev) => (prev ? { ...prev, money: Number(event.target.value) || 0 } : prev))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Giới tính</Label>
              <Select
  value={form.gender}
  onValueChange={(value) => onChange((prev) => (prev ? { ...prev, gender: value } : prev))}
>
  <SelectTrigger>
    <SelectValue placeholder="Chọn giới tính" />
  </SelectTrigger>
  <SelectContent>
    <SelectItem value={"m"}>Nam</SelectItem>
    <SelectItem value={"f"}>Nữ</SelectItem>
    <SelectItem value={"Khác"}>Khác</SelectItem>
  </SelectContent>
</Select>
            </div>
            <div className="space-y-1.5">
              <Label>Ngành nghề</Label>
              <Input
                value={form.career}
                onChange={(event) => onChange((prev) => (prev ? { ...prev, career: event.target.value } : prev))}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Hủy
          </Button>
          <Button onClick={onSave} disabled={!form || isSaving}>
            {isSaving ? "Đang lưu..." : "Lưu thay đổi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
