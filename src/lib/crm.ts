import type { RowDataPacket } from "mysql2/promise";

import { OrderSchema, type Order } from "@/app/(main)/dashboard/crm/_components/schema";
import { getDB } from "@/lib/db";
import { toDisplayPhone } from "@/lib/phone";

type OrderRow = RowDataPacket & {
  order_ID: string | null;
  brand: string | null;
  create_time: Date | string | null;
  customer_ID: string | null;
  name_customer: string | null;
  phone: string | null;
  address: string | null;
  seller: string | null;
  kenh_ban: string | null;
  note: string | null;
  tien_hang: number | string | null;
  giam_gia: number | string | null;
  thanh_tien: number | string | null;
  status: string | null;
  quantity: number | string | null;
  pro_ID: string | null;
  name_pro: string | null;
  brand_pro: string | null;
};

function parseString(value: unknown): string {
  return String(value ?? "");
}

function parseNumber(value: unknown): number {
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
    order_ID: parseString(row.order_ID),
    brand: parseString(row.brand),
    create_time: parseDate(row.create_time),
    customer_ID: parseString(row.customer_ID),
    name_customer: parseString(row.name_customer),
    phone: toDisplayPhone(row.phone),
    address: parseString(row.address),
    seller: parseString(row.seller),
    kenh_ban: parseString(row.kenh_ban),
    note: row.note ? String(row.note) : null,
    tien_hang: parseNumber(row.tien_hang),
    giam_gia: parseNumber(row.giam_gia),
    thanh_tien: parseNumber(row.thanh_tien),
    status: parseString(row.status),
    quantity: parseNumber(row.quantity),
    pro_ID: parseString(row.pro_ID),
    name_pro: parseString(row.name_pro),
    brand_pro: parseString(row.brand_pro),
  });
}

export async function getOrders(): Promise<Order[]> {
  const db = getDB();

  const [rows] = await db.query<OrderRow[]>(`
    SELECT
      order_ID,
      brand,
      create_time,
      customer_ID,
      name_customer,
      phone,
      address,
      seller,
      kenh_ban,
      note,
      tien_hang,
      giam_gia,
      thanh_tien,
      status,
      quantity,
      pro_ID,
      name_pro,
      brand_pro
    FROM orders
    ORDER BY create_time DESC
  `);

  return rows.map((row) => mapOrderRow(row));
}
