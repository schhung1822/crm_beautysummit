import type { RowDataPacket } from "mysql2/promise";

import { getDB } from "@/lib/db";
import { buildPhoneVariants, normalizePhoneDigits, toDisplayPhone } from "@/lib/phone";
import { CHECKIN_DONE_STATUS, parseTicketOrderNote, TICKET_ORDER_CHANNEL } from "@/lib/ticket-orders";

export type MiniAppTicketRow = RowDataPacket & {
  id: number;
  ordercode: string | null;
  name: string | null;
  phone: string | null;
  buyer_phone: string | null;
  ticketClass: string | null;
  status: string | null;
  create_time: Date | string | null;
  note: string | null;
};

function normalizeDigits(value: unknown): string {
  return normalizePhoneDigits(value);
}

function toIsoString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function isTransferLockedForViewer(row: MiniAppTicketRow, viewerPhone?: string): boolean {
  const meta = parseTicketOrderNote(row.note);
  const viewerDigits = normalizeDigits(viewerPhone);
  const holderDigits = normalizeDigits(row.phone);
  const buyerDigits = normalizeDigits(row.buyer_phone ?? meta.buyer_phone);

  return Boolean(
    viewerDigits && buyerDigits && viewerDigits === buyerDigits && holderDigits && holderDigits !== viewerDigits,
  );
}

function isTicketCheckedIn(row: MiniAppTicketRow): boolean {
  const meta = parseTicketOrderNote(row.note);
  return meta.is_checkin === 1 || meta.status_checkin === CHECKIN_DONE_STATUS;
}

function buildTicketStatusLabel(transferLocked: boolean, checkedIn: boolean): string {
  if (transferLocked) {
    return "Da chuyen ve";
  }

  return checkedIn ? "Da check-in" : "Chua check-in";
}

export function mapMiniAppTicketRow(row: MiniAppTicketRow, viewerPhone?: string) {
  const meta = parseTicketOrderNote(row.note);
  const checkedIn = isTicketCheckedIn(row);
  const transferLocked = isTransferLockedForViewer(row, viewerPhone);

  return {
    code: String(row.ordercode ?? "").trim(),
    name: String(row.name ?? ""),
    phone: toDisplayPhone(row.phone),
    ticketClass: String(row.ticketClass ?? ""),
    status: checkedIn ? "checked_in" : "pending",
    statusLabel: buildTicketStatusLabel(transferLocked, checkedIn),
    checkedIn,
    disabled: transferLocked,
    transferLocked,
    canOpen: !transferLocked,
    checkinTime: meta.checkin_time,
    createdAt: toIsoString(row.create_time),
    buyerName: meta.buyer_name ?? "",
    buyerPhone: toDisplayPhone(row.buyer_phone ?? meta.buyer_phone),
    holderName: meta.holder_name ?? String(row.name ?? ""),
    holderPhone: toDisplayPhone(meta.holder_phone ?? row.phone),
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
      ordercode,
      name,
      phone,
      buyer_phone,
      ticketClass,
      status,
      create_time,
      note
    FROM (
      SELECT
        id,
        COALESCE(order_ID, '') AS ordercode,
        COALESCE(name_customer, '') AS name,
        COALESCE(phone, '') AS phone,
        COALESCE(buyer_phone, '') AS buyer_phone,
        COALESCE(brand_pro, '') AS ticketClass,
        COALESCE(status, '') AS status,
        create_time,
        note
      FROM orders
      WHERE kenh_ban = ?
        AND order_ID IS NOT NULL
        AND order_ID <> ''
        AND phone IN (${placeholders})

      UNION

      SELECT
        id,
        COALESCE(order_ID, '') AS ordercode,
        COALESCE(name_customer, '') AS name,
        COALESCE(phone, '') AS phone,
        COALESCE(buyer_phone, '') AS buyer_phone,
        COALESCE(brand_pro, '') AS ticketClass,
        COALESCE(status, '') AS status,
        create_time,
        note
      FROM orders
      WHERE kenh_ban = ?
        AND order_ID IS NOT NULL
        AND order_ID <> ''
        AND buyer_phone IN (${placeholders})
    ) AS ticket_rows
    ORDER BY create_time DESC
    LIMIT 50
    `,
    [TICKET_ORDER_CHANNEL, ...phoneVariants, TICKET_ORDER_CHANNEL, ...phoneVariants],
  );

  return rows;
}
