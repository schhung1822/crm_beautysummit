/* eslint-disable complexity, unicorn/filename-case */
import { RowDataPacket } from "mysql2/promise";

import { channelSchema, type Channel } from "@/app/(main)/orders/_components/schema";
import { getDB } from "@/lib/db";

type Paging = { page?: number; pageSize?: number | "all" | -1 };

function parseString(value: unknown) {
  return String(value ?? "");
}

function parseNumber(value: unknown) {
  return Number(value) || 0;
}

function parseDate(value: unknown) {
  return value ? new Date(String(value)) : null;
}

function mapRowToChannel(row: Record<string, unknown>): Channel {
  return channelSchema.parse({
    ordercode: parseString(row.ordercode),
    name: parseString(row.name),
    phone: parseString(row.phone),
    email: parseString(row.email),
    class: parseString(row.class),
    money: parseNumber(row.money),
    money_VAT: parseNumber(row.money_VAT),
    status: parseString(row.status),
    update_time: parseDate(row.update_time),
    create_time: parseDate(row.create_time),
    gender: parseString(row.gender),
    career: parseString(row.career),
    status_checkin: parseString(row.status_checkin),
    checkin_time: parseDate(row.checkin_time),
  });
}

function isMissingTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_NO_SUCH_TABLE"
  );
}

async function queryOrdersTable(
  customerKey: string,
  pageSize?: number,
  offset?: number,
): Promise<{ rows: RowDataPacket[]; total: number }> {
  const db = getDB();
  const limitSql = pageSize ? " LIMIT ? OFFSET ? " : "";
  const limitParams = pageSize ? [pageSize, offset ?? 0] : [];

  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT
      COALESCE(ordercode, '') AS ordercode,
      COALESCE(name, '') AS name,
      COALESCE(phone, '') AS phone,
      COALESCE(email, '') AS email,
      COALESCE(class, '') AS class,
      COALESCE(money, 0) AS money,
      COALESCE(money_VAT, 0) AS money_VAT,
      COALESCE(status, '') AS status,
      update_time,
      create_time,
      COALESCE(gender, '') AS gender,
      COALESCE(career, '') AS career,
      CASE
        WHEN COALESCE(is_checkin, 0) = 1 OR COALESCE(number_checkin, 0) > 0 OR checkin_time IS NOT NULL THEN 'đã checkin'
        ELSE 'chưa checkin'
      END AS status_checkin,
      checkin_time
    FROM orders
    WHERE customer_id = ? OR phone = ?
    ORDER BY create_time DESC
    ${limitSql}
    `,
    [customerKey, customerKey, ...limitParams],
  );

  const [countRows] = await db.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM orders
    WHERE customer_id = ? OR phone = ?
    `,
    [customerKey, customerKey],
  );

  return {
    rows,
    total: Number(countRows[0]?.total ?? rows.length),
  };
}

async function queryLegacyOrdersTable(
  customerKey: string,
  pageSize?: number,
  offset?: number,
): Promise<{ rows: RowDataPacket[]; total: number }> {
  const db = getDB();
  const limitSql = pageSize ? " LIMIT ? OFFSET ? " : "";
  const limitParams = pageSize ? [pageSize, offset ?? 0] : [];

  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT
      COALESCE(orderCode, '') AS ordercode,
      COALESCE(name, '') AS name,
      COALESCE(phone, '') AS phone,
      COALESCE(email, '') AS email,
      COALESCE(class, '') AS class,
      COALESCE(money, 0) AS money,
      COALESCE(money_VAT, 0) AS money_VAT,
      COALESCE(trang_thai_thanh_toan, '') AS status,
      update_time,
      create_at AS create_time,
      COALESCE(gender, '') AS gender,
      COALESCE(career, '') AS career,
      COALESCE(status_checkin, '') AS status_checkin,
      date_checkin AS checkin_time
    FROM checkin_orders
    WHERE phone = ?
    ORDER BY create_at DESC
    ${limitSql}
    `,
    [customerKey, ...limitParams],
  );

  const [countRows] = await db.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM checkin_orders
    WHERE phone = ?
    `,
    [customerKey],
  );

  return {
    rows,
    total: Number(countRows[0]?.total ?? rows.length),
  };
}

export async function getOrdersByCustomer(
  customerIdRaw: string,
  paging?: Paging,
): Promise<{ rows: Channel[]; total: number }> {
  const customerKey = String(customerIdRaw || "").trim();
  const wantAll = !paging || paging.pageSize === undefined || paging.pageSize === "all" || Number(paging.pageSize) <= 0;
  const pageInput = paging ? paging.page : 1;
  const pageSizeInput = paging ? paging.pageSize : undefined;

  const page = Number(pageInput ?? 1) || 1;
  const pageSize = wantAll ? undefined : Number(pageSizeInput) || 20;
  const offset = pageSize ? (page - 1) * pageSize : undefined;

  try {
    const { rows, total } = await queryOrdersTable(customerKey, pageSize, offset);
    return { rows: rows.map((row) => mapRowToChannel(row as Record<string, unknown>)), total };
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }

    const { rows, total } = await queryLegacyOrdersTable(customerKey, pageSize, offset);
    return { rows: rows.map((row) => mapRowToChannel(row as Record<string, unknown>)), total };
  }
}
