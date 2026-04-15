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
          <DialogTitle>Chinh sua don hang</DialogTitle>
          <DialogDescription>Cap nhat thong tin ban ghi da chon</DialogDescription>
        </DialogHeader>

        {form && (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Ma don</Label>
              <Input
                value={form.ordercode}
                onChange={(event) => onChange((prev) => (prev ? { ...prev, ordercode: event.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Ho ten</Label>
              <Input
                value={form.name}
                onChange={(event) => onChange((prev) => (prev ? { ...prev, name: event.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>So dien thoai</Label>
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
              <Label>Hang ve</Label>
              <Input
                value={form.class}
                onChange={(event) => onChange((prev) => (prev ? { ...prev, class: event.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Tien</Label>
              <Input
                type="number"
                value={form.money}
                onChange={(event) =>
                  onChange((prev) => (prev ? { ...prev, money: Number(event.target.value) || 0 } : prev))
                }
              />
            </div>
            <div className="space-y-1.5">
              <Label>Gioi tinh</Label>
              <Input
                value={form.gender}
                onChange={(event) => onChange((prev) => (prev ? { ...prev, gender: event.target.value } : prev))}
              />
            </div>
            <div className="space-y-1.5">
              <Label>Nghe nghiep</Label>
              <Input
                value={form.career}
                onChange={(event) => onChange((prev) => (prev ? { ...prev, career: event.target.value } : prev))}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Huy
          </Button>
          <Button onClick={onSave} disabled={!form || isSaving}>
            {isSaving ? "Dang luu..." : "Luu thay doi"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
