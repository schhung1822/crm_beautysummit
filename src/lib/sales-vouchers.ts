import type { ResultSetHeader, RowDataPacket } from "mysql2/promise";

import { getDB } from "@/lib/db";

export const SALES_VOUCHER_CLASSY_VALUES = ["monet", "money", "rate"] as const;
export const SALES_VOUCHER_CLASS_VALUES = ["STANDARD", "GOLD", "RUBY"] as const;

export type SalesVoucherClassy = (typeof SALES_VOUCHER_CLASSY_VALUES)[number];
export type SalesVoucherClass = (typeof SALES_VOUCHER_CLASS_VALUES)[number];

export type SalesVoucherRecord = {
  id: number;
  voucher: string;
  classy: SalesVoucherClassy | null;
  money: number | null;
  rate: number | null;
  number: number | null;
  voucherClass: SalesVoucherClass | null;
  fromDate: string | null;
  toDate: string | null;
  createdAt: string | null;
  updatedAt: string | null;
  ncOrder: number | null;
};

export type SalesVoucherInput = {
  voucher?: string | null;
  classy?: string | null;
  money?: number | string | null;
  rate?: number | string | null;
  number?: number | string | null;
  voucherClass?: string | null;
  fromDate?: string | null;
  toDate?: string | null;
};

type SalesVoucherRow = RowDataPacket & {
  id: number;
  created_at: Date | string | null;
  updated_at: Date | string | null;
  nc_order: number | string | null;
  voucher: string | null;
  classy: string | null;
  money: number | string | bigint | null;
  rate: number | string | bigint | null;
  number: number | string | bigint | null;
  class: string | null;
  from_date: Date | string | null;
  to_date: Date | string | null;
};

function toNumberOrNull(value: unknown): number | null {
  if (value == null || String(value).trim() === "") {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : null;
}

function toDateOrNull(value: string | null | undefined): Date | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error("Ngày voucher không hợp lệ");
  }

  return parsed;
}

function toDateLabel(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString().slice(0, 10);
}

function normalizeClassy(value: string | null | undefined): SalesVoucherClassy | null {
  const normalized = String(value ?? "").trim();
  return SALES_VOUCHER_CLASSY_VALUES.includes(normalized as SalesVoucherClassy)
    ? (normalized as SalesVoucherClassy)
    : null;
}

function normalizeVoucherClass(value: string | null | undefined): SalesVoucherClass | null {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  return SALES_VOUCHER_CLASS_VALUES.includes(normalized as SalesVoucherClass)
    ? (normalized as SalesVoucherClass)
    : null;
}

function mapSalesVoucherRow(row: SalesVoucherRow): SalesVoucherRecord {
  return {
    id: row.id,
    voucher: String(row.voucher ?? "").trim(),
    classy: normalizeClassy(row.classy),
    money: toNumberOrNull(row.money),
    rate: toNumberOrNull(row.rate),
    number: toNumberOrNull(row.number),
    voucherClass: normalizeVoucherClass(row.class),
    fromDate: toDateLabel(row.from_date),
    toDate: toDateLabel(row.to_date),
    createdAt: toDateLabel(row.created_at),
    updatedAt: toDateLabel(row.updated_at),
    ncOrder: toNumberOrNull(row.nc_order),
  };
}

function normalizeInput(input: SalesVoucherInput) {
  const voucher = String(input.voucher ?? "").trim();
  if (!voucher) {
    throw new Error("Mã voucher là bắt buộc");
  }

  const fromDate = toDateOrNull(input.fromDate);
  const toDate = toDateOrNull(input.toDate);
  if (fromDate && toDate && toDate < fromDate) {
    throw new Error("Ngày kết thúc phải lớn hơn hoặc bằng ngày bắt đầu");
  }

  return {
    voucher,
    classy: normalizeClassy(input.classy) ?? "money",
    money: toNumberOrNull(input.money),
    rate: toNumberOrNull(input.rate),
    number: toNumberOrNull(input.number),
    voucherClass: normalizeVoucherClass(input.voucherClass),
    fromDate,
    toDate,
  };
}

async function findSalesVoucherById(id: number): Promise<SalesVoucherRecord | null> {
  const db = getDB();
  const [rows] = await db.query<SalesVoucherRow[]>(
    `
      SELECT id, created_at, updated_at, nc_order, voucher, classy, money, rate, number, \`class\`, from_date, to_date
      FROM voucher
      WHERE id = ?
      LIMIT 1
    `,
    [id],
  );

  return rows[0] ? mapSalesVoucherRow(rows[0]) : null;
}

export async function listSalesVouchers(): Promise<SalesVoucherRecord[]> {
  const db = getDB();
  const [rows] = await db.query<SalesVoucherRow[]>(
    `
      SELECT id, created_at, updated_at, nc_order, voucher, classy, money, rate, number, \`class\`, from_date, to_date
      FROM voucher
      ORDER BY nc_order ASC, id DESC
    `,
  );

  return rows.map(mapSalesVoucherRow);
}

export async function createSalesVoucher(input: SalesVoucherInput): Promise<SalesVoucherRecord> {
  const db = getDB();
  const normalized = normalizeInput(input);
  const [orderRows] = await db.query<RowDataPacket[]>("SELECT COALESCE(MAX(nc_order), 0) AS maxOrder FROM voucher");
  const nextOrder = Number(orderRows[0]?.maxOrder ?? 0) + 1;

  const [result] = await db.query<ResultSetHeader>(
    `
      INSERT INTO voucher
        (created_at, updated_at, nc_order, voucher, classy, money, rate, number, \`class\`, from_date, to_date)
      VALUES
        (NOW(), NOW(), ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      nextOrder,
      normalized.voucher,
      normalized.classy,
      normalized.money,
      normalized.rate,
      normalized.number,
      normalized.voucherClass,
      normalized.fromDate,
      normalized.toDate,
    ],
  );

  const created = await findSalesVoucherById(result.insertId);
  if (!created) {
    throw new Error("Không thể tạo voucher");
  }

  return created;
}

export async function updateSalesVoucher(id: number, input: SalesVoucherInput): Promise<SalesVoucherRecord> {
  const db = getDB();
  const normalized = normalizeInput(input);

  await db.query(
    `
      UPDATE voucher
      SET voucher = ?, classy = ?, money = ?, rate = ?, number = ?, \`class\` = ?, from_date = ?, to_date = ?, updated_at = NOW()
      WHERE id = ?
      LIMIT 1
    `,
    [
      normalized.voucher,
      normalized.classy,
      normalized.money,
      normalized.rate,
      normalized.number,
      normalized.voucherClass,
      normalized.fromDate,
      normalized.toDate,
      id,
    ],
  );

  const updated = await findSalesVoucherById(id);
  if (!updated) {
    throw new Error("Không tìm thấy voucher");
  }

  return updated;
}

export async function deleteSalesVoucher(id: number): Promise<number> {
  const db = getDB();
  const [result] = await db.query<ResultSetHeader>("DELETE FROM voucher WHERE id = ? LIMIT 1", [id]);
  return result.affectedRows;
}
