import type { RowDataPacket } from "mysql2/promise";

import type { JWTPayload } from "@/lib/auth";
import { getCurrentUser } from "@/lib/auth";
import { getDB } from "@/lib/db";

type HistoryTableColumnRow = RowDataPacket & {
  Field: string;
};

type HistoryEditPayload = {
  actor?: JWTPayload | null;
  action: "create" | "update" | "delete";
  tableName: string;
  recordId?: string | number | null;
  endpoint?: string;
  method?: string;
  beforeData?: unknown;
  afterData?: unknown;
  changedData?: unknown;
  description?: string | null;
};

const HISTORY_EDIT_TABLE = "history_edit";

function safeJsonStringify(value: unknown): string | null {
  if (value === undefined) {
    return null;
  }

  try {
    return JSON.stringify(value);
  } catch {
    return JSON.stringify({ value: String(value) });
  }
}

async function ensureHistoryEditTable(): Promise<void> {
  const db = getDB();
  await db.query(`
    CREATE TABLE IF NOT EXISTS \`${HISTORY_EDIT_TABLE}\` (
      id BIGINT UNSIGNED NOT NULL AUTO_INCREMENT,
      actor_user_id INT NULL,
      actor_username VARCHAR(191) NULL,
      actor_name VARCHAR(255) NULL,
      actor_role VARCHAR(64) NULL,
      action VARCHAR(32) NOT NULL,
      table_name VARCHAR(191) NOT NULL,
      record_id VARCHAR(191) NULL,
      endpoint VARCHAR(255) NULL,
      method VARCHAR(16) NULL,
      before_data LONGTEXT NULL,
      after_data LONGTEXT NULL,
      changed_data LONGTEXT NULL,
      description TEXT NULL,
      created_at DATETIME NULL DEFAULT CURRENT_TIMESTAMP,
      PRIMARY KEY (id),
      INDEX idx_history_edit_table_record (table_name, record_id),
      INDEX idx_history_edit_actor (actor_user_id, actor_username),
      INDEX idx_history_edit_created_at (created_at)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci
  `);
}

async function ensureHistoryEditColumns(): Promise<void> {
  const db = getDB();
  const [rows] = await db.query<HistoryTableColumnRow[]>(`SHOW COLUMNS FROM \`${HISTORY_EDIT_TABLE}\``);
  const columns = new Set(rows.map((row) => String(row.Field ?? "")));
  const definitions: Array<[string, string]> = [
    ["actor_user_id", "INT NULL"],
    ["actor_username", "VARCHAR(191) NULL"],
    ["actor_name", "VARCHAR(255) NULL"],
    ["actor_role", "VARCHAR(64) NULL"],
    ["action", "VARCHAR(32) NOT NULL"],
    ["table_name", "VARCHAR(191) NOT NULL"],
    ["record_id", "VARCHAR(191) NULL"],
    ["endpoint", "VARCHAR(255) NULL"],
    ["method", "VARCHAR(16) NULL"],
    ["before_data", "LONGTEXT NULL"],
    ["after_data", "LONGTEXT NULL"],
    ["changed_data", "LONGTEXT NULL"],
    ["description", "TEXT NULL"],
    ["created_at", "DATETIME NULL DEFAULT CURRENT_TIMESTAMP"],
  ];

  for (const [column, definition] of definitions) {
    if (!columns.has(column)) {
      await db.query(`ALTER TABLE \`${HISTORY_EDIT_TABLE}\` ADD COLUMN \`${column}\` ${definition}`);
    }
  }
}

export async function logHistoryEdit(payload: HistoryEditPayload): Promise<void> {
  try {
    const actor = payload.actor ?? (await getCurrentUser());
    const db = getDB();
    await ensureHistoryEditTable();
    await ensureHistoryEditColumns();
    await db.query(
      `
      INSERT INTO \`${HISTORY_EDIT_TABLE}\`
        (
          actor_user_id,
          actor_username,
          actor_name,
          actor_role,
          action,
          table_name,
          record_id,
          endpoint,
          method,
          before_data,
          after_data,
          changed_data,
          description
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        actor?.userId ?? null,
        actor?.username ?? null,
        actor?.name ?? null,
        actor?.role ?? null,
        payload.action,
        payload.tableName,
        payload.recordId == null ? null : String(payload.recordId),
        payload.endpoint ?? null,
        payload.method ?? null,
        safeJsonStringify(payload.beforeData),
        safeJsonStringify(payload.afterData),
        safeJsonStringify(payload.changedData),
        payload.description ?? null,
      ],
    );
  } catch (error) {
    console.error("Unable to write history_edit log:", error);
  }
}
