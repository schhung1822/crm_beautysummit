import * as React from "react";

import { Briefcase, Calendar, Mail, Phone, User2 } from "lucide-react";
import { z } from "zod";

import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import * as ticketOrders from "@/lib/ticket-orders";

import { channelSchema } from "./schema";

function getTooltipText(value: unknown) {
  if (value == null) return undefined;

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    const normalized = String(value).trim();
    return normalized.length > 0 ? normalized : undefined;
  }

  return undefined;
}

export function OrderDrawerRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value?: React.ReactNode;
}) {
  return (
    <div className="flex items-start gap-2.5">
      <div className="text-muted-foreground mt-0.5">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-muted-foreground text-[11px]">{label}</div>
        <div className="truncate text-sm font-medium whitespace-nowrap" title={getTooltipText(value)}>
          {value ?? "—"}
        </div>
      </div>
    </div>
  );
}

export function OrderDrawerBlock({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="bg-card/60 rounded-2xl border p-3">
      <div className="mb-2 text-sm font-semibold">{title}</div>
      <div className="grid gap-2.5">{children}</div>
    </div>
  );
}

export function OrderQuickEditSection({
  form,
  setForm,
  ticketClassOptions,
  paymentStatusOptions,
  careerQuickOptions,
}: {
  form: z.infer<typeof channelSchema>;
  setForm: React.Dispatch<React.SetStateAction<z.infer<typeof channelSchema>>>;
  ticketClassOptions: string[];
  paymentStatusOptions: string[];
  careerQuickOptions: string[];
}) {
  return (
    <OrderDrawerBlock title="Chỉnh sửa nhanh">
      <div className="grid gap-3">
        <div className="grid gap-1.5">
          <Label>Họ tên</Label>
          <Input value={form.name} onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))} />
        </div>

        <div className="grid gap-1.5">
          <Label>Số điện thoại</Label>
          <Input value={form.phone} onChange={(event) => setForm((prev) => ({ ...prev, phone: event.target.value }))} />
        </div>

        <div className="grid gap-1.5">
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Giới tính</Label>
            <Select
              value={form.gender || ""}
              onValueChange={(value) => setForm((prev) => ({ ...prev, gender: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="m">Nam</SelectItem>
                <SelectItem value="f">Nữ</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Hạng vé</Label>
            <Select value={form.class || ""} onValueChange={(value) => setForm((prev) => ({ ...prev, class: value }))}>
              <SelectTrigger>
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent>
                {ticketClassOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Tiền</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={Number.isFinite(Number(form.money)) ? Number(form.money).toLocaleString("en-GB") : "0"}
              onChange={(event) => {
                const numericValue = event.target.value.replace(/\D/g, "");
                setForm((prev) => ({ ...prev, money: Number(numericValue) || 0 }));
              }}
            />
          </div>
          <div className="grid gap-1.5">
            <Label>Thành tiền</Label>
            <Input
              type="text"
              inputMode="numeric"
              value={Number.isFinite(Number(form.money_VAT)) ? Number(form.money_VAT).toLocaleString("en-GB") : "0"}
              onChange={(event) => {
                const numericValue = event.target.value.replace(/\D/g, "");
                setForm((prev) => ({ ...prev, money_VAT: Number(numericValue) || 0 }));
              }}
            />
          </div>
        </div>

        <div className="grid gap-1.5">
          <Label>Nghề nghiệp</Label>
          <Input
            list="career-quick-options"
            value={form.career}
            onChange={(event) => setForm((prev) => ({ ...prev, career: event.target.value }))}
          />
          <datalist id="career-quick-options">
            {careerQuickOptions.map((option) => (
              <option key={option} value={option} />
            ))}
          </datalist>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="grid gap-1.5">
            <Label>Trạng thái</Label>
            <Select
              value={form.status || "new"}
              onValueChange={(value) => setForm((prev) => ({ ...prev, status: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent>
                {paymentStatusOptions.map((option) => (
                  <SelectItem key={option} value={option}>
                    {option}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-1.5">
            <Label>Check-in</Label>
            <Select
              value={String(ticketOrders.normalizeCheckinFlag(form.is_checkin))}
              onValueChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  is_checkin: value === "1" ? 1 : 0,
                  number_checkin: value === "1" ? Math.max(1, Number(prev.number_checkin || 0)) : 0,
                  status_checkin: ticketOrders.buildCheckinStatusLabel(value),
                  checkin_time: value === "1" ? (prev.checkin_time ?? new Date()) : null,
                }))
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Chọn" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Đã check-in</SelectItem>
                <SelectItem value="0">Chưa check-in</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>
    </OrderDrawerBlock>
  );
}

export function OrderCustomerInfoSection({
  name,
  phone,
  email,
}: {
  name: string;
  phone?: string | null;
  email?: string | null;
}) {
  return (
    <OrderDrawerBlock title="Khách hàng">
      <OrderDrawerRow icon={<User2 className="h-4 w-4" />} label="Họ tên" value={name} />
      <OrderDrawerRow icon={<Phone className="h-4 w-4" />} label="Số điện thoại" value={phone ?? "—"} />
      <OrderDrawerRow icon={<Mail className="h-4 w-4" />} label="Email" value={email ?? "—"} />
    </OrderDrawerBlock>
  );
}

export function OrderExtraInfoSection({
  career,
  status,
  isCheckin,
}: {
  career?: string | null;
  status?: string | null;
  isCheckin?: string | number | null;
}) {
  return (
    <OrderDrawerBlock title="Thông tin thêm">
      <OrderDrawerRow icon={<Briefcase className="h-4 w-4" />} label="Ngành nghề" value={career ?? "—"} />
      <OrderDrawerRow icon={<Calendar className="h-4 w-4" />} label="Trạng thái thanh toán" value={status ?? "—"} />
      <OrderDrawerRow
        icon={<Calendar className="h-4 w-4" />}
        label="Trạng thái check-in"
        value={ticketOrders.buildCheckinStatusLabel(isCheckin)}
      />
    </OrderDrawerBlock>
  );
}

export function OrderMetaBadges({
  createdAt,
  updatedAt,
  gender,
}: {
  createdAt: string;
  updatedAt: string;
  gender?: string | null;
}) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <Badge variant="outline" className="max-w-full truncate rounded-full" title={createdAt || undefined}>
        <Calendar className="mr-1 h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{createdAt || "—"}</span>
      </Badge>
      <Badge variant="outline" className="max-w-full truncate rounded-full" title={updatedAt || undefined}>
        <Calendar className="mr-1 h-3.5 w-3.5 shrink-0" />
        <span className="truncate">{updatedAt || "—"}</span>
      </Badge>
      {gender ? (
        <Badge variant="outline" className="max-w-full truncate rounded-full" title={gender}>
          <span className="truncate">{gender}</span>
        </Badge>
      ) : null}
    </div>
  );
}
