import type { RowDataPacket } from "mysql2/promise";

import { OrderSchema, type Order } from "@/app/(main)/dashboard/crm/_components/schema";
import { getDB } from "@/lib/db";
import { toDisplayPhone } from "@/lib/phone";

type OrderRow = RowDataPacket & {
  ordercode: string | null;
  create_time: Date | string | null;
  customer_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  class: string | null;
  money: number | string | null;
  money_VAT: number | string | null;
  status: string | null;
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

function parseDate(value: unknown): Date {
  if (!value) {
    return new Date(0);
  }

  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? new Date(0) : parsed;
}

function mapOrderRow(row: OrderRow): Order {
  return OrderSchema.parse({
    ordercode: parseString(row.ordercode),
    create_time: parseDate(row.create_time),
    customer_id: parseString(row.customer_id),
    name: parseString(row.name),
    phone: toDisplayPhone(row.phone),
    email: parseString(row.email),
    gender: parseString(row.gender),
    class: parseString(row.class),
    money: parseNumber(row.money),
    money_VAT: parseNumber(row.money_VAT),
    status: parseString(row.status),
    career: parseString(row.career),
    is_checkin: parseNumber(row.is_checkin),
    number_checkin: parseNumber(row.number_checkin),
    checkin_time: row.checkin_time ? parseDate(row.checkin_time) : null,
  });
}

export async function getOrders(): Promise<Order[]> {
  const db = getDB();

  const [rows] = await db.query<OrderRow[]>(`
    SELECT
      ordercode,
      create_time,
      customer_id,
      name,
      phone,
      email,
      gender,
      class,
      money,
      money_VAT,
      status,
      career,
      is_checkin,
      number_checkin,
      checkin_time
    FROM orders
    ORDER BY create_time DESC
  `);

  return rows.map((row) => mapOrderRow(row));
}
