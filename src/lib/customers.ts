import type { RowDataPacket } from "mysql2/promise";

import { userSchema, Users } from "@/app/(main)/customers/_components/schema";
import { getDB } from "@/lib/db";
import { toDisplayPhone } from "@/lib/phone";

type CustomerRow = RowDataPacket & {
  customer_ID: string | null;
  name: string | null;
  phone: string | null;
  class: string | null;
  gender: string | null;
  birth: Date | string | null;
  create_time: Date | string | null;
  last_payment: Date | string | null;
  company: string | null;
  address: string | null;
  create_by: string | null;
  note: string | null;
  branch: string | null;
  no_hien_tai: string | number | null;
  tong_ban: string | number | null;
  tong_ban_tru_tra_hang: string | number | null;
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

function mapCustomerRow(row: CustomerRow): Users {
  return userSchema.parse({
    customer_ID: parseString(row.customer_ID),
    name: parseString(row.name),
    phone: toDisplayPhone(row.phone),
    class: parseString(row.class),
    gender: parseString(row.gender),
    birth: parseDate(row.birth),
    create_time: parseDate(row.create_time) ?? new Date(0),
    last_payment: parseDate(row.last_payment) ?? new Date(0),
    company: parseString(row.company),
    address: parseString(row.address),
    create_by: parseString(row.create_by),
    note: parseString(row.note),
    branch: parseString(row.branch),
    no_hien_tai: parseString(row.no_hien_tai),
    tong_ban: parseString(row.tong_ban),
    tong_ban_tru_tra_hang: parseString(row.tong_ban_tru_tra_hang),
  });
}

export async function getUser(): Promise<Users[]> {
  const db = getDB();

  const [rows] = await db.query<CustomerRow[]>(`
    SELECT
      customer_ID,
      name,
      phone,
      class,
      gender,
      birth,
      company,
      address,
      create_by,
      create_time,
      last_payment,
      note,
      branch,
      no_hien_tai,
      tong_ban,
      tong_ban_tru_tra_hang
    FROM customer 
  `);

  return rows.map((row) => mapCustomerRow(row));
}
