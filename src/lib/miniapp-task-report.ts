import type { RowDataPacket } from "mysql2/promise";

import { getDB } from "@/lib/db";
import { queryMiniAppTicketRowsByPhone } from "@/lib/miniapp-tickets";
import { toDatabasePhone } from "@/lib/phone";

type TaskReportIdentity = {
  zid: string;
  phone: string;
  name?: string;
  avatar?: string;
};

type TaskReportSyncOptions = {
  orderCode?: string | null;
  missionValue?: string | null;
};

type TaskColumnRow = RowDataPacket & {
  Field: string;
  Type: string;
};

type TaskIdRow = RowDataPacket & {
  id: number;
};

type TaskOrderRow = RowDataPacket & {
  next_order: number;
};

type TaskColumnMeta = {
  name: string;
  type: string;
  isNumeric: boolean;
};

const TASK_TABLE_NAME = "task";
const TASK_COLUMN_CACHE_TTL_MS = 60_000;
const TASK_SYSTEM_COLUMNS = new Set(["id", "created_at", "updated_at", "created_by", "updated_by", "nc_order", "ordercode"]);

let taskColumnCache:
  | {
      value: Map<string, TaskColumnMeta>;
      expiresAt: number;
    }
  | null = null;

function parseString(value: unknown): string {
  return String(value ?? "").trim();
}

function isNumericTaskColumn(sqlType: string): boolean {
  return /int|decimal|numeric|float|double|real|bit/i.test(sqlType);
}

function missionIdToTaskColumn(missionId: string): string {
  const normalizedMissionId = parseString(missionId).toUpperCase();
  const separatorIndex = normalizedMissionId.indexOf("-");

  if (separatorIndex < 0) {
    return "";
  }

  return normalizedMissionId.slice(separatorIndex + 1).toLowerCase().replace(/-/g, "_");
}

async function loadTaskColumnMap(): Promise<Map<string, TaskColumnMeta>> {
  const cachedValue = taskColumnCache;
  if (cachedValue && cachedValue.expiresAt > Date.now()) {
    return cachedValue.value;
  }

  const db = getDB();
  const [tableRows] = await db.query<RowDataPacket[]>(`SHOW TABLES LIKE '${TASK_TABLE_NAME}'`);
  if (!Array.isArray(tableRows) || tableRows.length === 0) {
    const emptyMap = new Map<string, TaskColumnMeta>();
    taskColumnCache = {
      value: emptyMap,
      expiresAt: Date.now() + TASK_COLUMN_CACHE_TTL_MS,
    };
    return emptyMap;
  }

  const [columnRows] = await db.query<TaskColumnRow[]>(`SHOW COLUMNS FROM \`${TASK_TABLE_NAME}\``);
  const columnMap = new Map<string, TaskColumnMeta>();

  columnRows.forEach((row) => {
    const name = parseString(row.Field).toLowerCase();
    if (!name) {
      return;
    }

    columnMap.set(name, {
      name,
      type: parseString(row.Type),
      isNumeric: isNumericTaskColumn(parseString(row.Type)),
    });
  });

  taskColumnCache = {
    value: columnMap,
    expiresAt: Date.now() + TASK_COLUMN_CACHE_TTL_MS,
  };

  return columnMap;
}

async function resolveTaskOrderCode(phone: string, preferredOrderCode?: string | null): Promise<string> {
  const normalizedPreferredOrderCode = parseString(preferredOrderCode).toUpperCase();
  if (normalizedPreferredOrderCode) {
    return normalizedPreferredOrderCode;
  }

  const normalizedPhone = toDatabasePhone(phone) ?? "";
  if (!normalizedPhone) {
    return "";
  }

  const ticketRows = await queryMiniAppTicketRowsByPhone(normalizedPhone);
  return parseString(ticketRows.find((row) => parseString(row.ordercode))?.ordercode).toUpperCase();
}

function buildTaskColumnValue(columnMeta: TaskColumnMeta, missionValue?: string | null): string | number {
  const normalizedMissionValue = parseString(missionValue);

  if (!normalizedMissionValue) {
    return columnMeta.isNumeric ? 1 : "1";
  }

  if (!columnMeta.isNumeric) {
    return normalizedMissionValue;
  }

  const normalizedNumericValue = Number(normalizedMissionValue.replace(/,/g, ""));
  return Number.isFinite(normalizedNumericValue) ? normalizedNumericValue : 1;
}

async function findExistingTaskRowId(orderCode: string): Promise<number | null> {
  const db = getDB();
  const [rows] = await db.query<TaskIdRow[]>(
    `
    SELECT id
    FROM \`${TASK_TABLE_NAME}\`
    WHERE TRIM(COALESCE(ordercode, '')) = ?
    ORDER BY id DESC
    LIMIT 1
    `,
    [orderCode],
  );

  return rows[0]?.id ?? null;
}

async function computeNextTaskOrder(): Promise<number> {
  const db = getDB();
  const [rows] = await db.query<TaskOrderRow[]>(
    `SELECT COALESCE(MAX(nc_order), 0) + 1 AS next_order FROM \`${TASK_TABLE_NAME}\``,
  );

  return Number(rows[0]?.next_order) || 1;
}

async function insertTaskRow(orderCode: string, columnMeta: TaskColumnMeta, columnValue: string | number): Promise<void> {
  const db = getDB();
  const now = new Date();
  const columnMap = await loadTaskColumnMap();
  const entries: Array<[string, unknown]> = [];

  if (columnMap.has("created_at")) {
    entries.push(["created_at", now]);
  }
  if (columnMap.has("updated_at")) {
    entries.push(["updated_at", now]);
  }
  if (columnMap.has("created_by")) {
    entries.push(["created_by", "miniapp-report"]);
  }
  if (columnMap.has("updated_by")) {
    entries.push(["updated_by", "miniapp-report"]);
  }
  if (columnMap.has("nc_order")) {
    entries.push(["nc_order", await computeNextTaskOrder()]);
  }
  if (columnMap.has("ordercode")) {
    entries.push(["ordercode", orderCode]);
  }

  entries.push([columnMeta.name, columnValue]);

  const columnSql = entries.map(([columnName]) => `\`${columnName}\``).join(", ");
  const placeholderSql = entries.map(() => "?").join(", ");
  const params = entries.map(([, value]) => value);

  await db.query(
    `
    INSERT INTO \`${TASK_TABLE_NAME}\`
      (${columnSql})
    VALUES (${placeholderSql})
    `,
    params,
  );
}

async function updateTaskRow(rowId: number, columnMeta: TaskColumnMeta, columnValue: string | number): Promise<void> {
  const db = getDB();
  const columnMap = await loadTaskColumnMap();
  const updates = [`\`${columnMeta.name}\` = ?`];
  const params: unknown[] = [columnValue];

  if (columnMap.has("updated_at")) {
    updates.push("`updated_at` = ?");
    params.push(new Date());
  }
  if (columnMap.has("updated_by")) {
    updates.push("`updated_by` = ?");
    params.push("miniapp-report");
  }

  params.push(rowId);

  await db.query(
    `
    UPDATE \`${TASK_TABLE_NAME}\`
    SET
      ${updates.join(",\n      ")}
    WHERE id = ?
    LIMIT 1
    `,
    params,
  );
}

export async function syncMiniAppTaskReport(
  identity: TaskReportIdentity,
  missionId: string,
  options: TaskReportSyncOptions = {},
): Promise<void> {
  const normalizedMissionId = parseString(missionId);
  const columnName = missionIdToTaskColumn(normalizedMissionId);

  if (!columnName) {
    return;
  }

  const columnMap = await loadTaskColumnMap();
  const columnMeta = columnMap.get(columnName);
  if (!columnMeta || TASK_SYSTEM_COLUMNS.has(columnMeta.name)) {
    return;
  }

  const orderCode = await resolveTaskOrderCode(identity.phone, options.orderCode);
  if (!orderCode) {
    return;
  }

  const columnValue = buildTaskColumnValue(columnMeta, options.missionValue);
  const existingRowId = await findExistingTaskRowId(orderCode);

  if (existingRowId) {
    await updateTaskRow(existingRowId, columnMeta, columnValue);
    return;
  }

  await insertTaskRow(orderCode, columnMeta, columnValue);
}
