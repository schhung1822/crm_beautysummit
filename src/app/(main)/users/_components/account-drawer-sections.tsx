import { Globe, Mail, ShieldCheck, Smartphone, User2 } from "lucide-react";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

import { SectionCard, StatCard } from "../../customers/_components/customer-detail-blocks";

import { formatDate, getDisplayValue, type AccountEditForm } from "./account-detail-utils";
import type { AccountUser } from "./schema";

export function AccountEditSection({
  visible,
  form,
  onInputChange,
  onSelectChange,
}: {
  visible: boolean;
  form: AccountEditForm;
  onInputChange: (key: keyof AccountEditForm) => (event: React.ChangeEvent<HTMLInputElement>) => void;
  onSelectChange: (key: keyof AccountEditForm, value: string) => void;
}) {
  if (!visible) {
    return null;
  }

  return (
    <SectionCard
      title="Chỉnh sửa tài khoản"
    >
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
          <Label htmlFor="account-password">Mật khẩu mới</Label>
          <Input
            id="account-password"
            value={form.password || ""}
            onChange={onInputChange("password")}
            type="password"
            autoComplete="new-password"
            className="h-10 rounded-lg bg-white"
            placeholder="Để trống nếu không đổi"
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
    </SectionCard>
  );
}

export function AccountInfoSection({ item }: { item: AccountUser }) {
  return (
    <SectionCard
      title="Thông tin tài khoản"
    >
      <div className="grid gap-3 md:grid-cols-2">
        <StatCard label="Username" value={getDisplayValue(item.username)} icon={<User2 className="size-3.5" />} />
        <StatCard label="Email" value={getDisplayValue(item.email)} icon={<Mail className="size-3.5" />} />
        <StatCard label="Điện thoại" value={getDisplayValue(item.phone)} icon={<Smartphone className="size-3.5" />} />
        <StatCard label="Zalo ID" value={getDisplayValue(item.zid)} icon={<Globe className="size-3.5" />} />
        <StatCard label="Ngày tạo" value={formatDate(item.create_time)} icon={<ShieldCheck className="size-3.5" />} />
        <StatCard
          label="Cập nhật cuối"
          value={formatDate(item.update_time)}
          icon={<ShieldCheck className="size-3.5" />}
        />
      </div>
    </SectionCard>
  );
}
