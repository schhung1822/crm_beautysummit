import type { RowDataPacket } from "mysql2";

import { userOASchema, UsersOA } from "@/app/(main)/zalo-oa/_components/schema";
import { getDB } from "@/lib/db";
import { toDisplayPhone } from "@/lib/phone";

type UserOARow = RowDataPacket & {
  user_id: string | number | null;
  alias: string | null;
  follower: string | number | null;
  is_sensitive: string | number | null;
  avatar: string | null;
  phone: string | null;
  city: string | null;
  address: string | null;
  district: string | null;
};

export async function getUserOA(): Promise<UsersOA[]> {
  const db = getDB();

  const [rows] = await db.query<UserOARow[]>(`
    SELECT
      user_id,
      alias,
      follower,
      is_sensitive,
      avatar,
      phone,
      city,
      address,
      district
    FROM user_zaloOA 
  `);

  return rows.map((r) =>
    userOASchema.parse({
      user_id: String(r.user_id),
      alias: String(r.alias ?? ""),
      follower: String(r.follower ?? ""),
      is_sensitive: String(r.is_sensitive ?? ""),
      avatar: String(r.avatar ?? ""),
      phone: toDisplayPhone(r.phone),
      city: String(r.city ?? ""),
      address: String(r.address ?? ""),
      district: String(r.district ?? ""),
    }),
  );
}
