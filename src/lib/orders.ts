// src/lib/channels.ts
import { channelSchema, Channel } from "@/app/(main)/orders/_components/schema";
import { getDB } from "@/lib/db";

export interface GetChannelsOptions {
  from?: Date;
  to?: Date;
  limit?: number;
  offset?: number;
}

export async function getChannels(options?: GetChannelsOptions): Promise<Channel[]> {
  const db = getDB();
  const { from, to, limit = 10000, offset = 0 } = options ?? {};

  // Xây dựng WHERE clause động
  let whereClause = "";
  const params: (Date | number)[] = [];

  if (from) {
    whereClause += "WHERE `create_at` >= ?";
    params.push(from);
  }

  if (to) {
    if (whereClause) {
      whereClause += " AND `create_at` <= ?";
    } else {
      whereClause = "WHERE `create_at` <= ?";
    }
    params.push(to);
  }

  const [rows] = await db.query<any[]>(
    `
    SELECT
      orderCode,
      name,
      phone,
      email,
      class,
      money,
      money_VAT,
      trang_thai_thanh_toan,
      update_time,
      create_at,
      gender,
      career,
      status_checkin,
      date_checkin
    FROM checkin_orders
    ${whereClause}
    ORDER BY create_at DESC
    LIMIT ? OFFSET ?
  `,
    [...params, limit, offset],
  );

  return (rows ?? []).map((r) =>
    channelSchema.parse({
      orderCode: String(r.orderCode ?? ""),
      name: String(r.name ?? ""),
      phone: String(r.phone ?? ""),
      email: String(r.email ?? ""),
      class: String(r.class ?? ""),
      money: Number(r.money) || 0,
      money_VAT: Number(r.money_VAT) || 0,
      trang_thai_thanh_toan: String(r.trang_thai_thanh_toan ?? ""),
      update_time: r.update_time ? new Date(r.update_time) : null,
      create_at: r.create_at ? new Date(r.create_at) : r.created_at ? new Date(r.created_at) : null,
      gender: String(r.gender ?? ""),
      career: String(r.career ?? ""),
      status_checkin: String(r.status_checkin ?? ""),
      date_checkin: r.date_checkin ? new Date(r.date_checkin) : null,
    }),
  );
}
