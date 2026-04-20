import { RowDataPacket } from "mysql2/promise";

import { channelSchema, type Channel } from "@/app/(main)/orders/_components/schema";
import { getDB } from "@/lib/db";
import { toDisplayPhone } from "@/lib/phone";
import { buildCheckinStatusLabel, normalizeCheckinFlag } from "@/lib/ticket-orders";

export interface GetChannelsOptions {
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

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

function parseString(value: unknown): string {
  return String(value ?? "");
}

function parseNumber(value: unknown): number {
  if (typeof value === "string") {
    value = value.replace(/,/g, "");
  }
  return Number(value) || 0;
}

function parseDate(value: unknown): Date | null {
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

export async function getChannels(options?: GetChannelsOptions): Promise<Channel[]> {
  const db = getDB();
  const { from, to, limit = 10000, offset = 0 } = options ?? {};

  const whereParts: string[] = [];
  const params: (string | Date | number)[] = [];

  if (from) {
    whereParts.push("create_time >= ?");
    params.push(from);
  }

  if (to) {
    whereParts.push("create_time <= ?");
    params.push(to);
  }

  const whereSql = whereParts.length > 0 ? `WHERE ${whereParts.join(" AND ")}` : "";

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
    ${whereSql}
    ORDER BY create_time DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset],
  );

  return rows.map((row) => mapRowToChannel(row));
}
