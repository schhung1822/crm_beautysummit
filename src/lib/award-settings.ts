import type { RowDataPacket } from "mysql2/promise";

import { getDB } from "@/lib/db";

export type AwardGateStatus = "open" | "pending" | "closed";

export type AwardGateState = {
  isOpen: boolean;
  status: AwardGateStatus;
  startTime: string | null;
  endTime: string | null;
  serverTime: string;
  message: string;
};

type AwardSettingRow = RowDataPacket & {
  is_open: number | string | null;
  start_time: Date | string | null;
  end_time: Date | string | null;
};

type TableColumnRow = RowDataPacket & {
  Field: string;
};

async function ensureAwardSettingsTable(): Promise<void> {
  const db = getDB();
  await db.query(`
    CREATE TABLE IF NOT EXISTS award_settings (
      id INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
      is_open TINYINT(1) NOT NULL DEFAULT 1,
      start_time DATETIME NULL,
      end_time DATETIME NULL,
      created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

function toIsoString(value: Date | string | null | undefined): string | null {
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value.toISOString();
  }

  const normalized = String(value).trim();
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized.includes("T") ? normalized : normalized.replace(" ", "T"));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseTime(value: Date | string | null | undefined): number | null {
  const isoValue = toIsoString(value);
  if (!isoValue) {
    return null;
  }

  const timestamp = new Date(isoValue).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function isEnabled(value: unknown): boolean {
  if (typeof value === "number") {
    return value === 1;
  }

  const normalized = String(value ?? "1").trim().toLowerCase();
  return normalized === "1" || normalized === "true" || normalized === "yes" || normalized === "open";
}

async function getAwardSettingsColumns(): Promise<Set<string>> {
  const db = getDB();
  const [rows] = await db.query<TableColumnRow[]>("SHOW COLUMNS FROM award_settings");
  return new Set(rows.map((row) => String(row.Field ?? "").trim()).filter(Boolean));
}

export async function getAwardGateState(): Promise<AwardGateState> {
  await ensureAwardSettingsTable();

  const db = getDB();
  const columns = await getAwardSettingsColumns();
  const orderClause = columns.has("id") ? "ORDER BY id DESC" : "";
  const [rows] = await db.query<AwardSettingRow[]>(`
    SELECT is_open, start_time, end_time
    FROM award_settings
    ${orderClause}
    LIMIT 1
  `);

  const row = rows[0];
  const now = Date.now();
  const startMs = parseTime(row?.start_time);
  const endMs = parseTime(row?.end_time);
  const startTime = toIsoString(row?.start_time);
  const endTime = toIsoString(row?.end_time);
  const settingOpen = row ? isEnabled(row.is_open) : true;

  if (!settingOpen) {
    return {
      isOpen: false,
      status: "closed",
      startTime,
      endTime,
      serverTime: new Date(now).toISOString(),
      message: "Cổng bình chọn đã đóng",
    };
  }

  if (startMs !== null && now < startMs) {
    return {
      isOpen: false,
      status: "pending",
      startTime,
      endTime,
      serverTime: new Date(now).toISOString(),
      message: "Cổng bình chọn chưa mở",
    };
  }

  if (endMs !== null && now >= endMs) {
    return {
      isOpen: false,
      status: "closed",
      startTime,
      endTime,
      serverTime: new Date(now).toISOString(),
      message: "Cổng bình chọn đã đóng",
    };
  }

  return {
    isOpen: true,
    status: "open",
    startTime,
    endTime,
    serverTime: new Date(now).toISOString(),
    message: "Cổng bình chọn đang mở",
  };
}

export async function assertAwardGateOpen(): Promise<AwardGateState> {
  const gate = await getAwardGateState();
  if (!gate.isOpen) {
    throw new Error(gate.message || "Cổng bình chọn đã đóng");
  }

  return gate;
}
