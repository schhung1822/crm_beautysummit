"use client";

import * as React from "react";

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

import { CLASSY_OPTIONS, type SalesVoucherForm, VOUCHER_CLASS_OPTIONS } from "./sales-voucher-manager.utils";

type SalesVoucherFormDialogProps = {
  open: boolean;
  form: SalesVoucherForm;
  saving: boolean;
  onOpenChange: (open: boolean) => void;
  onFormChange: (form: SalesVoucherForm) => void;
  onSave: () => void;
};

function normalizeNumericInput(value: string) {
  return value.replace(/[^0-9]/g, "");
}

function VoucherInputField({
  id,
  label,
  value,
  placeholder,
  type = "text",
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  placeholder?: string;
  type?: string;
  onChange: (value: string) => void;
}) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        type={type}
        value={value}
        placeholder={placeholder}
        onChange={(event) =>
          onChange(type === "number" ? normalizeNumericInput(event.target.value) : event.target.value)
        }
      />
    </div>
  );
}

export function SalesVoucherFormDialog({
  open,
  form,
  saving,
  onOpenChange,
  onFormChange,
  onSave,
}: SalesVoucherFormDialogProps) {
  const updateForm = React.useCallback(
    <K extends keyof SalesVoucherForm>(key: K, value: SalesVoucherForm[K]) => {
      onFormChange({ ...form, [key]: value });
    },
    [form, onFormChange],
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[720px]">
        <DialogHeader>
          <DialogTitle>{form.id == null ? "Thêm voucher" : "Sửa voucher"}</DialogTitle>
          <DialogDescription>Quản lý dữ liệu theo các trường trong bảng voucher.</DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 md:grid-cols-2">
          <VoucherInputField
            id="voucher-code"
            label="Mã voucher"
            value={form.voucher}
            placeholder="Nhập mã voucher"
            onChange={(value) => updateForm("voucher", value)}
          />

          <div className="grid gap-2">
            <Label htmlFor="voucher-classy">Kiểu voucher</Label>
            <Select
              value={form.classy}
              onValueChange={(value) => updateForm("classy", value as SalesVoucherForm["classy"])}
            >
              <SelectTrigger id="voucher-classy">
                <SelectValue placeholder="Chọn kiểu voucher" />
              </SelectTrigger>
              <SelectContent>
                {CLASSY_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <VoucherInputField
            id="voucher-money"
            label="Số tiền"
            type="number"
            value={form.money}
            placeholder="VD: 99000"
            onChange={(value) => updateForm("money", value)}
          />
          <VoucherInputField
            id="voucher-rate"
            label="Tỷ lệ (%)"
            type="number"
            value={form.rate}
            placeholder="VD: 10"
            onChange={(value) => updateForm("rate", value)}
          />
          <VoucherInputField
            id="voucher-number"
            label="Số lượng"
            type="number"
            value={form.number}
            placeholder="Không giới hạn nếu bỏ trống"
            onChange={(value) => updateForm("number", value)}
          />

          <div className="grid gap-2">
            <Label htmlFor="voucher-class">Hạng vé áp dụng</Label>
            <Select
              value={form.voucherClass}
              onValueChange={(value) => updateForm("voucherClass", value as SalesVoucherForm["voucherClass"])}
            >
              <SelectTrigger id="voucher-class">
                <SelectValue placeholder="Chọn hạng vé" />
              </SelectTrigger>
              <SelectContent>
                {VOUCHER_CLASS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <VoucherInputField
            id="voucher-from-date"
            label="Từ ngày"
            type="date"
            value={form.fromDate}
            onChange={(value) => updateForm("fromDate", value)}
          />
          <VoucherInputField
            id="voucher-to-date"
            label="Đến ngày"
            type="date"
            value={form.toDate}
            onChange={(value) => updateForm("toDate", value)}
          />
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Hủy
          </Button>
          <Button type="button" onClick={onSave} disabled={saving}>
            {saving ? "Đang lưu..." : "Lưu voucher"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
