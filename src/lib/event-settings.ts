import { getDB } from "@/lib/db";
import type { RowDataPacket } from "mysql2/promise";

const EVENT_DAY1_KEY = "beauty_event_day1";
const DEFAULT_EVENT_DAY1 = process.env.BEAUTY_EVENT_DAY1_DATE || "2026-06-19";

function isDateValue(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}-\d{2}-\d{2}$/.test(value);
}

async function ensureSettingsTable() {
  const db = getDB();
  await db.query(`
    CREATE TABLE IF NOT EXISTS app_settings (
      setting_key VARCHAR(100) NOT NULL PRIMARY KEY,
      setting_value TEXT NULL,
      updated_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

export async function getEventDay1Date(): Promise<string> {
  await ensureSettingsTable();
  const db = getDB();
  const [rows] = await db.query<Array<RowDataPacket & { setting_value: string | null }>>(
    "SELECT setting_value FROM app_settings WHERE setting_key = ? LIMIT 1",
    [EVENT_DAY1_KEY],
  );
  const value = rows[0]?.setting_value;
  return isDateValue(value) ? value : DEFAULT_EVENT_DAY1;
}

export async function setEventDay1Date(value: string): Promise<string> {
  if (!isDateValue(value)) {
    throw new Error("Invalid date");
  }

  await ensureSettingsTable();
  const db = getDB();
  await db.query(
    `
    INSERT INTO app_settings (setting_key, setting_value, updated_at)
    VALUES (?, ?, NOW())
    ON DUPLICATE KEY UPDATE setting_value = VALUES(setting_value), updated_at = NOW()
    `,
    [EVENT_DAY1_KEY, value],
  );
  return value;
}
