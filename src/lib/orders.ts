import { RowDataPacket } from "mysql2/promise";

import { channelSchema, Channel } from "@/app/(main)/orders/_components/schema";
import { getDB } from "@/lib/db";
import { CHECKIN_PENDING_STATUS, parseTicketOrderNote, TICKET_ORDER_CHANNEL } from "@/lib/ticket-orders";

export interface GetChannelsOptions {
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

function parseString(value: unknown): string {
  return String(value ?? "");
}

function parseNumber(value: unknown): number {
  return Number(value) || 0;
}

function parseDate(value: unknown): Date | null {
  return value ? new Date(String(value)) : null;
}

function mapRowToChannel(row: Record<string, unknown>): Channel {
  const meta = parseTicketOrderNote(row.note);

  return channelSchema.parse({
    ordercode: parseString(row.ordercode),
    name: parseString(row.name),
    phone: parseString(row.phone),
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

export async function getChannels(options?: GetChannelsOptions): Promise<Channel[]> {
  const db = getDB();
  const { from, to, limit = 10000, offset = 0 } = options ?? {};

  const whereParts: string[] = ["kenh_ban = ?"];
  const params: (string | Date | number)[] = [TICKET_ORDER_CHANNEL];

  if (from) {
    whereParts.push("create_time >= ?");
    params.push(from);
  }

  if (to) {
    whereParts.push("create_time <= ?");
    params.push(to);
  }

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
    WHERE ${whereParts.join(" AND ")}
    ORDER BY create_time DESC
    LIMIT ? OFFSET ?
    `,
    [...params, limit, offset],
  );

  return rows.map((row) => mapRowToChannel(row as Record<string, unknown>));
}
