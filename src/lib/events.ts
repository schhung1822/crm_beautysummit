import type { RowDataPacket } from "mysql2";

import { academySchema, Academy } from "@/app/(main)/votes/_components/schema";
import { getDB } from "@/lib/db";

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

  return rows.map((r) =>
    academySchema.parse({
      ordercode: String(r.ordercode ?? ""),
      name: String(r.name ?? ""),
      phone: String(r.phone ?? ""),
      email: String(r.email ?? ""),
      gender: String(r.gender ?? ""),
      time_vote: r.time_vote ? new Date(r.time_vote) : null,
      brand_id: String(r.brand_id ?? ""),
      brand_name: String(r.brand_name ?? ""),
      category: String(r.category ?? ""),
      product: String(r.product ?? ""),
      voted: String(r.voted ?? ""),
      link: String(r.link ?? ""),
    }),
  );
}
