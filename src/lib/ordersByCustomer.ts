/* eslint-disable complexity, unicorn/filename-case */
import { RowDataPacket } from "mysql2/promise";

import { channelSchema, type Channel } from "@/app/(main)/orders/_components/schema";
import { getDB } from "@/lib/db";
import { buildPhoneVariants, toDisplayPhone } from "@/lib/phone";
import { buildCheckinStatusLabel, normalizeCheckinFlag } from "@/lib/ticket-orders";

type Paging = { page?: number; pageSize?: number | "all" | -1 };

type OrderRow = RowDataPacket & {
  ordercode: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  class: string | null;
  money: number | string | null;
  money_VAT: number | string | null;
  status: string | null;
  update_time: Date | string | null;
  create_time: Date | string | null;
  gender: string | null;
  career: string | null;
  is_checkin: number | string | null;
  number_checkin: number | string | null;
  checkin_time: Date | string | null;
};

function parseString(value: unknown) {
  return String(value ?? "");
}

function parseNumber(value: unknown) {
  if (typeof value === "string") {
    value = value.replace(/,/g, "");
  }
  return Number(value) || 0;
}

function parseDate(value: unknown) {
  return value ? new Date(String(value)) : null;
}

function mapRowToChannel(row: OrderRow): Channel {
  const isCheckin = normalizeCheckinFlag(row.is_checkin);

  return channelSchema.parse({
    ordercode: parseString(row.ordercode),
    name: parseString(row.name),
    phone: toDisplayPhone(row.phone),
    email: parseString(row.email),
    class: parseString(row.class),
    money: parseNumber(row.money),
    money_VAT: parseNumber(row.money_VAT),
    status: parseString(row.status),
    update_time: parseDate(row.update_time),
    create_time: parseDate(row.create_time),
    gender: parseString(row.gender),
    career: parseString(row.career),
    is_checkin: isCheckin,
    number_checkin: parseNumber(row.number_checkin),
    status_checkin: buildCheckinStatusLabel(isCheckin),
    checkin_time: parseDate(row.checkin_time),
  });
}

export async function getOrdersByCustomer(
  customerIdRaw: string,
  paging?: Paging,
): Promise<{ rows: Channel[]; total: number }> {
  const db = getDB();
  const customerKey = String(customerIdRaw).trim();

  if (!customerKey) {
    return { rows: [], total: 0 };
  }

  const wantAll = !paging || paging.pageSize === undefined || paging.pageSize === "all" || Number(paging.pageSize) <= 0;
  const page = Number(paging?.page ?? 1) || 1;
  const pageSizeValue = paging ? paging.pageSize : undefined;
  const pageSize = wantAll ? undefined : Number(pageSizeValue ?? 20) || 20;
  const offset = pageSize ? (page - 1) * pageSize : 0;
  const limitSql = pageSize ? " LIMIT ? OFFSET ? " : "";
  const limitParams = pageSize ? [pageSize, offset] : [];
  const phoneVariants = buildPhoneVariants(customerKey);
  const phoneSql = phoneVariants.length > 0 ? ` OR phone IN (${phoneVariants.map(() => "?").join(", ")})` : "";
  const phoneParams = phoneVariants.length > 0 ? phoneVariants : [];

  const [rows] = await db.query<OrderRow[]>(
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
      COALESCE(is_checkin, 0) AS is_checkin,
      COALESCE(number_checkin, 0) AS number_checkin,
      checkin_time
    FROM orders
    WHERE customer_id = ?${phoneSql}
    ORDER BY create_time DESC
    ${limitSql}
    `,
    [customerKey, ...phoneParams, ...limitParams],
  );

  const [countRows] = await db.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM orders
    WHERE customer_id = ?${phoneSql}
    `,
    [customerKey, ...phoneParams],
  );

  return {
    rows: rows.map((row) => mapRowToChannel(row)),
    total: Number(countRows[0]?.total ?? rows.length),
  };
}
