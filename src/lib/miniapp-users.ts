import type { RowDataPacket } from "mysql2/promise";

import { getDB } from "@/lib/db";
import { toDatabasePhone } from "@/lib/phone";

export type MiniAppUserIdentity = {
  zid: string;
  phone: string;
  avatar: string;
  name?: string;
};

export type MiniAppUserRecord = {
  id: number;
  user: string;
  email: string;
  role: string;
  status: string;
  zid: string;
  name: string;
  phone: string;
  avatar: string;
};

type MiniAppUserRow = RowDataPacket & {
  id: number;
  user: string | null;
  email: string | null;
  role: string | null;
  status: string | null;
  zid: string | null;
  name: string | null;
  phone: string | null;
  avatar: string | null;
};

const DEFAULT_ZALO_SDK_NAME = "User Name";

export function normalizeMiniAppName(value?: string): string | undefined {
  const normalizedValue = value?.trim() ?? "";
  if (!normalizedValue || normalizedValue === DEFAULT_ZALO_SDK_NAME) {
    return undefined;
  }

  return normalizedValue;
}

function mapMiniAppUserRow(row: MiniAppUserRow): MiniAppUserRecord {
  return {
    id: row.id,
    user: String(row.user ?? ""),
    email: String(row.email ?? ""),
    role: String(row.role ?? "user"),
    status: String(row.status ?? "active"),
    zid: String(row.zid ?? ""),
    name: String(row.name ?? ""),
    phone: toDatabasePhone(row.phone) ?? "",
    avatar: String(row.avatar ?? ""),
  };
}

export async function upsertMiniAppUser(identity: MiniAppUserIdentity): Promise<MiniAppUserRecord> {
  const db = getDB();
  const now = new Date();
  const zid = identity.zid.trim();
  const phone = toDatabasePhone(identity.phone) ?? "";
  const avatar = identity.avatar.trim();
  const name = normalizeMiniAppName(identity.name);

  await db.query(
    `
    INSERT INTO user
      (
        created_at,
        updated_at,
        created_by,
        updated_by,
        zid,
        phone,
        avatar,
        name,
        password,
        role,
        status,
        last_login,
        create_time,
        update_time
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      phone = VALUES(phone),
      avatar = VALUES(avatar),
      name = IF(VALUES(name) IS NOT NULL AND VALUES(name) <> '', VALUES(name), name),
      role = COALESCE(role, 'user'),
      status = 'active',
      last_login = VALUES(last_login),
      updated_by = VALUES(updated_by),
      updated_at = VALUES(updated_at),
      update_time = VALUES(update_time)
    `,
    [
      now,
      now,
      "zalo-miniapp",
      "zalo-miniapp",
      zid,
      phone,
      avatar,
      name ?? `Zalo ${zid}`,
      null,
      "user",
      "active",
      now,
      now,
      now,
    ],
  );

  const [rows] = await db.query<MiniAppUserRow[]>(
    `
    SELECT
      id,
      user,
      email,
      role,
      status,
      zid,
      name,
      phone,
      avatar
    FROM user
    WHERE zid = ?
    LIMIT 1
    `,
    [zid],
  );

  const userRow = rows[0];
  if (!userRow) {
    throw new Error("Unable to upsert mini app user");
  }

  return mapMiniAppUserRow(userRow);
}
