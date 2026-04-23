import type { RowDataPacket } from "mysql2/promise";

import { getDB } from "@/lib/db";
import { buildPhoneVariants, toDisplayPhone } from "@/lib/phone";

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
  latest_checkin_time: Date | string | null;
  latest_zone_id: string | null;
  checked_zones: string | null;
  checkin_count: number | string | null;
  source: string | null;
};

function toIsoString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function parseCheckedZones(value: string | null | undefined): string[] {
  return String(value ?? "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseCheckinCount(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function mapMiniAppTicketRow(row: MiniAppTicketRow) {
  const checkedZones = parseCheckedZones(row.checked_zones);
  const checkinCount = Math.max(parseCheckinCount(row.checkin_count), checkedZones.length);
  const latestCheckinTime = row.latest_checkin_time ?? row.checkin_time;
  const checkedIn = checkinCount > 0 || Boolean(latestCheckinTime);

  return {
    code: String(row.ordercode ?? "").trim(),
    name: String(row.name ?? ""),
    phone: toDisplayPhone(row.phone),
    ticketClass: String(row.ticketClass ?? ""),
    status: checkedIn ? "checked_in" : "pending",
    statusLabel: checkedIn ? "Đã check-in" : "Chưa check-in",
    checkedIn,
    disabled: false,
    transferLocked: false,
    canOpen: true,
    checkinTime: toIsoString(latestCheckinTime),
    createdAt: toIsoString(row.create_time),
    buyerName: "",
    buyerPhone: "",
    holderName: String(row.name ?? ""),
    holderPhone: toDisplayPhone(row.phone),
    zoneId: String(row.latest_zone_id ?? "").trim(),
    checkedZones,
    checkinCount,
  };
}

function buildMiniAppTicketSelectSql(whereClause: string): string {
  return `
    SELECT
      o.id,
      COALESCE(o.ordercode, '') AS ordercode,
      COALESCE(o.name, '') AS name,
      COALESCE(o.phone, '') AS phone,
      COALESCE(o.class, '') AS ticketClass,
      COALESCE(o.status, '') AS status,
      o.create_time,
      COALESCE(o.is_checkin, 0) AS is_checkin,
      COALESCE(o.number_checkin, 0) AS number_checkin,
      o.checkin_time,
      checkin_summary.latest_checkin_time,
      COALESCE(checkin_summary.latest_zone_id, '') AS latest_zone_id,
      COALESCE(checkin_summary.checked_zones, '') AS checked_zones,
      COALESCE(checkin_summary.checkin_count, 0) AS checkin_count,
      COALESCE(o.source, '') AS source
    FROM orders o
    LEFT JOIN (
      SELECT
        l.order_id,
        COUNT(*) AS checkin_count,
        MAX(l.checkin_time) AS latest_checkin_time,
        GROUP_CONCAT(DISTINCT l.zone_id ORDER BY l.zone_id SEPARATOR ',') AS checked_zones,
        SUBSTRING_INDEX(
          GROUP_CONCAT(l.zone_id ORDER BY l.checkin_time DESC, l.id DESC SEPARATOR ','),
          ',',
          1
        ) AS latest_zone_id
      FROM checkin_log l
      GROUP BY l.order_id
    ) checkin_summary
      ON checkin_summary.order_id = o.id
    WHERE ${whereClause}
  `;
}

export async function queryMiniAppTicketRowsByPhone(phone: string): Promise<MiniAppTicketRow[]> {
  const db = getDB();
  const phoneVariants = buildPhoneVariants(phone);
  const placeholders = phoneVariants.map(() => "?").join(", ");
  const [rows] = await db.query<MiniAppTicketRow[]>(
    `
    ${buildMiniAppTicketSelectSql(`o.phone IN (${placeholders})`)}
      AND o.ordercode IS NOT NULL
      AND TRIM(o.ordercode) <> ''
    ORDER BY o.create_time DESC
    LIMIT 50
    `,
    [...phoneVariants],
  );

  return rows;
}

export async function queryMiniAppTicketRowByCode(ticketCode: string): Promise<MiniAppTicketRow | null> {
  const db = getDB();
  const [rows] = await db.query<MiniAppTicketRow[]>(
    `
    ${buildMiniAppTicketSelectSql("o.ordercode = ?")}
    LIMIT 1
    `,
    [ticketCode],
  );

  return rows[0] ?? null;
}
