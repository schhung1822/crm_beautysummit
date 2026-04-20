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

import type { Academy } from "./schema";

type EditVoteDialogProps = {
  open: boolean;
  form: Academy | null;
  isSaving: boolean;
  onOpenChange: (open: boolean) => void;
  onChange: (updater: (prev: Academy | null) => Academy | null) => void;
  onCancel: () => void;
  onSave: () => void;
};

export function EditVoteDialog({
  open,
  form,
  isSaving,
  onOpenChange,
  onChange,
  onCancel,
  onSave,
}: EditVoteDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl">
        <DialogHeader>
          <DialogTitle>Chỉnh sửa bản ghi bình chọn</DialogTitle>
          <DialogDescription>Cập nhật thông tin bản ghi đã chọn</DialogDescription>
        </DialogHeader>

        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Mã đơn</Label>
              <Input
                value={form.ordercode}
                onChange={(e) => onChange((prev) => (prev ? { ...prev, ordercode: e.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Họ tên</Label>
              <Input
                value={form.name}
                onChange={(e) => onChange((prev) => (prev ? { ...prev, name: e.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Số điện thoại</Label>
              <Input
                value={form.phone}
                onChange={(e) => onChange((prev) => (prev ? { ...prev, phone: e.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Email</Label>
              <Input
                value={form.email}
                onChange={(e) => onChange((prev) => (prev ? { ...prev, email: e.target.value } : prev))}
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
              <Label>Mã thương hiệu</Label>
              <Input
                value={form.brand_id}
                onChange={(e) => onChange((prev) => (prev ? { ...prev, brand_id: e.target.value } : prev))}
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
