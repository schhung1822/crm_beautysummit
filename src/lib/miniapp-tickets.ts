import type { RowDataPacket } from "mysql2/promise";

import { getDB } from "@/lib/db";
import { buildPhoneVariants, toDisplayPhone } from "@/lib/phone";
import { isTicketCheckedIn } from "@/lib/ticket-orders";

export type MiniAppTicketRow = RowDataPacket & {
  id: number;
  ordercode: string | null;
  name: string | null;
  phone: string | null;
  ticketClass: string | null;
  status: string | null;
  create_time: Date | string | null;
  is_checkin: number | string | null;
  number_checkin: number | string | null;
  checkin_time: Date | string | null;
};

function toIsoString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

export function mapMiniAppTicketRow(row: MiniAppTicketRow) {
  const checkedIn = isTicketCheckedIn(row);

  return {
    code: String(row.ordercode ?? "").trim(),
    name: String(row.name ?? ""),
    phone: toDisplayPhone(row.phone),
    ticketClass: String(row.ticketClass ?? ""),
    status: checkedIn ? "checked_in" : "pending",
    statusLabel: checkedIn ? "Da check-in" : "Chua check-in",
    checkedIn,
    disabled: checkedIn,
    transferLocked: false,
    canOpen: true,
    checkinTime: toIsoString(row.checkin_time),
    createdAt: toIsoString(row.create_time),
    buyerName: "",
    buyerPhone: "",
    holderName: String(row.name ?? ""),
    holderPhone: toDisplayPhone(row.phone),
  };
}

export async function queryMiniAppTicketRowsByPhone(phone: string): Promise<MiniAppTicketRow[]> {
  const db = getDB();
  const phoneVariants = buildPhoneVariants(phone);
  const placeholders = phoneVariants.map(() => "?").join(", ");
  const [rows] = await db.query<MiniAppTicketRow[]>(
    `
    SELECT
      id,
      COALESCE(ordercode, '') AS ordercode,
      COALESCE(name, '') AS name,
      COALESCE(phone, '') AS phone,
      COALESCE(class, '') AS ticketClass,
      COALESCE(status, '') AS status,
      create_time,
      COALESCE(is_checkin, 0) AS is_checkin,
      COALESCE(number_checkin, 0) AS number_checkin,
      checkin_time
    FROM orders
    WHERE phone IN (${placeholders})
      AND ordercode IS NOT NULL
      AND TRIM(ordercode) <> ''
    ORDER BY create_time DESC
    LIMIT 50
    `,
    [...phoneVariants],
  );

  return rows;
}
