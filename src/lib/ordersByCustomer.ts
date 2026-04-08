/* eslint-disable complexity, unicorn/filename-case */
import { RowDataPacket } from "mysql2/promise";

import { channelSchema, type Channel } from "@/app/(main)/orders/_components/schema";
import { getDB } from "@/lib/db";
import { buildPhoneVariants, toDisplayPhone } from "@/lib/phone";
import { CHECKIN_PENDING_STATUS, parseTicketOrderNote, TICKET_ORDER_CHANNEL } from "@/lib/ticket-orders";

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
  const meta = parseTicketOrderNote(row.note);

  return channelSchema.parse({
    ordercode: parseString(row.ordercode),
    name: parseString(row.name),
    phone: toDisplayPhone(row.phone),
    email: meta.email ?? "",
    class: parseString(row.class),
    money: parseNumber(row.money),
    money_VAT: parseNumber(row.money_VAT),
    status: parseString(row.status),
    update_time: parseDate(row.update_time),
    create_time: parseDate(row.create_time),
    gender: meta.gender ?? "",
    career: meta.career ?? "",
    status_checkin: meta.status_checkin || CHECKIN_PENDING_STATUS,
    checkin_time: parseDate(meta.checkin_time),
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

  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT
      COALESCE(order_ID, '') AS ordercode,
      COALESCE(name_customer, '') AS name,
      COALESCE(phone, '') AS phone,
      COALESCE(brand_pro, '') AS class,
      COALESCE(tien_hang, 0) AS money,
      COALESCE(thanh_tien, 0) AS money_VAT,
      COALESCE(status, '') AS status,
      updated_at AS update_time,
      create_time,
      note
    FROM orders
    WHERE kenh_ban = ?
      AND (customer_ID = ?${phoneSql})
    ORDER BY create_time DESC
    ${limitSql}
    `,
    [TICKET_ORDER_CHANNEL, customerKey, ...phoneParams, ...limitParams],
  );

  const [countRows] = await db.query<RowDataPacket[]>(
    `
    SELECT COUNT(*) AS total
    FROM orders
    WHERE kenh_ban = ?
      AND (customer_ID = ?${phoneSql})
    `,
    [TICKET_ORDER_CHANNEL, customerKey, ...phoneParams],
  );

  return {
    rows: rows.map((row) => mapRowToChannel(row as Record<string, unknown>)),
    total: Number(countRows[0]?.total ?? rows.length),
  };
}
