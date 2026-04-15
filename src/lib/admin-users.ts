import type { RowDataPacket } from "mysql2/promise";

import { accountUserSchema, type AccountUser } from "@/app/(main)/users/_components/schema";
import { getDB } from "@/lib/db";
import { toDisplayPhone } from "@/lib/phone";

export type AdminUserRow = RowDataPacket & {
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
  last_login: Date | string | null;
  create_time: Date | string | null;
  update_time: Date | string | null;
};

function parseString(value: unknown): string {
  return String(value ?? "");
}

function parseDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function mapAdminUserRow(row: AdminUserRow): AccountUser {
  return accountUserSchema.parse({
    id: row.id,
    user_id: parseString(row.user_id),
    username: parseString(row.user),
    email: parseString(row.email),
    zid: parseString(row.zid),
    phone: toDisplayPhone(row.phone),
    name: parseString(row.name),
    avatar: parseString(row.avatar),
    role: parseString(row.role),
    status: parseString(row.status),
    last_login: parseDate(row.last_login),
    create_time: parseDate(row.create_time),
    update_time: parseDate(row.update_time),
  });
}

export async function getAdminUsers(): Promise<AccountUser[]> {
  const db = getDB();
  const [rows] = await db.query<AdminUserRow[]>(`
    SELECT
      id,
      user_id,
      user,
      email,
      zid,
      phone,
      name,
      avatar,
      role,
      status,
      last_login,
      create_time,
      update_time
    FROM user
    ORDER BY id DESC
  `);

  return rows.map((row) => mapAdminUserRow(row));
}
