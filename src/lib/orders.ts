import { RowDataPacket } from "mysql2/promise";

import { channelSchema, Channel } from "@/app/(main)/orders/_components/schema";
import { getDB } from "@/lib/db";

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
  return value ? new Date(value as string) : null;
}

function buildChannelData(r: Record<string, unknown>) {
  return {
    ordercode: parseString(r.ordercode),
    name: parseString(r.name),
    phone: parseString(r.phone),
    email: parseString(r.email),
    class: parseString(r.class),
    money: parseNumber(r.money),
    money_VAT: parseNumber(r.money_VAT),
    status: parseString(r.status),
    gender: parseString(r.gender),
    career: parseString(r.career),
    status_checkin: parseString(r.status_checkin),
  };
}

function buildChannelDates(r: Record<string, unknown>) {
  return {
    update_time: parseDate(r.update_time),
    create_time: parseDate(r.create_time),
    checkin_time: parseDate(r.checkin_time),
  };
}

function mapRowToChannel(r: Record<string, unknown>): Channel {
  const data = buildChannelData(r);
  const dates = buildChannelDates(r);
  return channelSchema.parse({ ...data, ...dates });
}

function isMissingTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_NO_SUCH_TABLE"
  );
}

async function queryOrdersTable(db: ReturnType<typeof getDB>, whereClause: string, params: (Date | number)[]) {
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
    ${whereClause}
    ORDER BY create_time DESC
    LIMIT ? OFFSET ?
  `,
    params,
  );

  return rows;
}

async function queryLegacyCheckinOrders(db: ReturnType<typeof getDB>, whereClause: string, params: (Date | number)[]) {
  const [rows] = await db.query<RowDataPacket[]>(
    `
    SELECT
      ordercode,
      name,
      phone,
      email,
      class,
      money,
      money_VAT,
      status,
      update_time,
      create_time,
      gender,
      career,
      status_checkin,
      checkin_time
    FROM checkin_orders
    ${whereClause}
    ORDER BY create_time DESC
    LIMIT ? OFFSET ?
  `,
    params,
  );

  return rows;
}

export async function getChannels(options?: GetChannelsOptions): Promise<Channel[]> {
  const db = getDB();
  const { from, to, limit = 10000, offset = 0 } = options ?? {};

  let whereClause = "";
  const params: (Date | number)[] = [];

  if (from) {
    whereClause += "WHERE `create_time` >= ?";
    params.push(from);
  }

  if (to) {
    if (whereClause) {
      whereClause += " AND `create_time` <= ?";
    } else {
      whereClause = "WHERE `create_time` <= ?";
    }
    params.push(to);
  }

  const queryParams = [...params, limit, offset];
  let rows: RowDataPacket[];

  try {
    rows = await queryOrdersTable(db, whereClause, queryParams);
  } catch (error) {
    if (!isMissingTableError(error)) {
      throw error;
    }

    rows = await queryLegacyCheckinOrders(db, whereClause, queryParams);
  }

  return rows.map(mapRowToChannel);
}
