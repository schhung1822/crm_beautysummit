import type { RowDataPacket } from "mysql2/promise";

import { userSchema, type Users } from "@/app/(main)/customers/_components/schema";
import { getDB } from "@/lib/db";
import { toDisplayPhone } from "@/lib/phone";

export type CustomerRow = RowDataPacket & {
  customer_ID: string | null;
  name: string | null;
  gender: string | null;
  phone: string | null;
  email: string | null;
  career: string | null;
  user_ip: string | null;
  user_agent: string | null;
  fbp: string | null;
  fbc: string | null;
  create_time: Date | string | null;
};

function parseString(value: unknown): string {
  return String(value ?? "");
}

function parseDate(value: unknown): Date | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(String(value));
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function mapCustomerRow(row: CustomerRow): Users {
  return userSchema.parse({
    customer_ID: parseString(row.customer_ID),
    name: parseString(row.name),
    gender: parseString(row.gender),
    phone: toDisplayPhone(row.phone),
    email: parseString(row.email),
    career: parseString(row.career),
    user_ip: parseString(row.user_ip),
    user_agent: parseString(row.user_agent),
    fbp: parseString(row.fbp),
    fbc: parseString(row.fbc),
    create_time: parseDate(row.create_time),
  });
}

export async function getUser(): Promise<Users[]> {
  const db = getDB();
  const [rows] = await db.query<CustomerRow[]>(`
    SELECT
      customer_id AS customer_ID,
      name,
      gender,
      phone,
      email,
      career,
      user_ip,
      user_agent,
      fbp,
      fbc,
      create_time
    FROM customer
    ORDER BY id DESC
  `);

  return rows.map((row) => mapCustomerRow(row));
}
