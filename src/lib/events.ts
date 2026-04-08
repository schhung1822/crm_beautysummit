import type { RowDataPacket } from "mysql2";

import { academySchema, Academy } from "@/app/(main)/votes/_components/schema";
import { getDB } from "@/lib/db";
import { toDisplayPhone } from "@/lib/phone";

type AcademyRow = RowDataPacket & {
  ordercode: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  time_vote: Date | string | null;
  brand_id: string | null;
  brand_name: string | null;
  category: string | null;
  product: string | null;
  voted: string | null;
  link: string | null;
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

function mapAcademyRow(row: AcademyRow): Academy {
  return academySchema.parse({
    ordercode: parseString(row.ordercode),
    name: parseString(row.name),
    phone: toDisplayPhone(row.phone),
    email: parseString(row.email),
    gender: parseString(row.gender),
    time_vote: parseDate(row.time_vote),
    brand_id: parseString(row.brand_id),
    brand_name: parseString(row.brand_name),
    category: parseString(row.category),
    product: parseString(row.product),
    voted: parseString(row.voted),
    link: parseString(row.link),
  });
}

export async function getAcademy(): Promise<Academy[]> {
  const db = getDB();

  const [rows] = await db.query<AcademyRow[]>(`
    SELECT
      v.ordercode,
      v.name,
      v.phone,
      v.email,
      v.gender,
      v.time_vote,
      v.brand_id,
      b.brand_name,
      b.category,
      b.product,
      b.voted,
      b.link
    FROM voted v
    LEFT JOIN brand b ON b.brand_id = v.brand_id
  `);

  return rows.map((row) => mapAcademyRow(row));
}
