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
                value={form.orderCode}
                onChange={(e) => onChange((prev) => (prev ? { ...prev, orderCode: e.target.value } : prev))}
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
              <Label>Hạng vé</Label>
              <Input
                value={form.class}
                onChange={(e) => onChange((prev) => (prev ? { ...prev, class: e.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Thành tiền</Label>
              <Input
                type="number"
                value={form.money}
                onChange={(e) => onChange((prev) => (prev ? { ...prev, money: Number(e.target.value) || 0 } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Thành tiền (VAT)</Label>
              <Input
                type="number"
                value={form.money_VAT}
                onChange={(e) =>
                  onChange((prev) => (prev ? { ...prev, money_VAT: Number(e.target.value) || 0 } : prev))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Trạng thái thanh toán</Label>
              <Input
                value={form.trang_thai_thanh_toan}
                onChange={(e) => onChange((prev) => (prev ? { ...prev, trang_thai_thanh_toan: e.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Giới tính</Label>
              <Input
                value={form.gender}
                onChange={(e) => onChange((prev) => (prev ? { ...prev, gender: e.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nghề nghiệp</Label>
              <Input
                value={form.career}
                onChange={(e) => onChange((prev) => (prev ? { ...prev, career: e.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Trạng thái check-in</Label>
              <Input
                value={form.status_checkin}
                onChange={(e) => onChange((prev) => (prev ? { ...prev, status_checkin: e.target.value } : prev))}
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
