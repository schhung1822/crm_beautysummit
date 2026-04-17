import { toDisplayPhone } from "@/lib/phone";

import type { AccountUser } from "./schema";

export const EMPTY_VALUE = "--";

export const formatDate = (value: Date | null) => (value ? value.toLocaleString("en-GB") : EMPTY_VALUE);

export const getDisplayValue = (value: unknown) => {
  const normalized = String(value ?? "").trim();
  return normalized.length > 0 ? normalized : EMPTY_VALUE;
};

export type AccountEditForm = {
  username: string;
  email: string;
  zid: string;
  phone: string;
  name: string;
  avatar: string;
  role: string;
  status: string;
  password?: string;
};

export function createEditForm(item: AccountUser): AccountEditForm {
  return {
    username: item.username,
    email: item.email,
    zid: item.zid,
    phone: item.phone,
    name: item.name,
    avatar: item.avatar,
    role: item.role || "staff",
    status: item.status || "active",
    password: "",
  };
}

export function mapUpdatedAccountUser(data: {
  id: number;
  user_id: string | null;
  user: string | null;
  email: string | null;
  zid: string | null;
  phone: string | null;
  name: string | null;
  avatar: string | null;
  role: string | null;
  status: string | null;
  last_login: Date | null;
  create_time: Date | null;
  update_time: Date | null;
}): AccountUser {
  return {
    id: data.id,
    user_id: data.user_id ?? "",
    username: data.user ?? "",
    email: data.email ?? "",
    zid: data.zid ?? "",
    phone: toDisplayPhone(data.phone),
    name: data.name ?? "",
    avatar: data.avatar ?? "",
    role: data.role ?? "",
    status: data.status ?? "",
    last_login: data.last_login,
    create_time: data.create_time,
    update_time: data.update_time,
  };
}
