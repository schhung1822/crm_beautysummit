/* eslint-disable complexity, max-lines */
import { NextRequest, NextResponse } from "next/server";

import type { RowDataPacket } from "mysql2/promise";

import { getCurrentUser, type JWTPayload } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { buildPhoneVariants, toDatabasePhone, toDisplayPhone } from "@/lib/phone";
import {
  getStaffCheckinZone,
  normalizeStaffTicketTier,
  normalizeTicketCode,
  parseStaffQrPayload,
  type StaffCheckinTier,
  type StaffCheckinZone,
} from "@/lib/staff-checkin";
import { buildCheckinStatusLabel, isTicketCheckedIn } from "@/lib/ticket-orders";

type StaffCheckinPayload = {
  payload?: string;
  code?: string;
  phone?: string;
  zoneId?: string;
};

type TicketOrderRow = RowDataPacket & {
  id: number;
  ordercode: string | null;
  name: string | null;
  phone: string | null;
  ticketClass: string | null;
  customerId: string | null;
  status: string | null;
  is_checkin: number | string | null;
  number_checkin: number | string | null;
  checkin_time: Date | string | null;
  ref: string | null;
  source: string | null;
};

type HistoryRow = RowDataPacket & {
  id: number;
  name: string | null;
  phone: string | null;
  ordercode: string | null;
  ticketClass: string | null;
  ref: string | null;
  source: string | null;
  checkin_time: Date | string | null;
};

type StatsRow = RowDataPacket & {
  ticketClass: string | null;
  total: number | string | null;
};

type StaffCheckinGuest = {
  code: string;
  name: string;
  phone: string;
  tier: StaffCheckinTier;
  ticketClass: string;
  zoneId: string;
  zoneName: string;
  checkedIn: boolean;
  checkinTime: string | null;
};

function json(body: unknown, init?: ResponseInit): NextResponse {
  return NextResponse.json(body, init);
}

function toIsoString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function buildZoneSource(zone: StaffCheckinZone): string {
  return `staff-checkin:${zone.id}:${zone.name}`;
}

function parseZoneSource(value: string | null | undefined): { zoneId: string; zoneName: string } {
  const source = String(value ?? "");
  if (!source.startsWith("staff-checkin:")) {
    return { zoneId: "", zoneName: "" };
  }

  const [, zoneId = "", zoneName = ""] = source.split(":");
  return { zoneId, zoneName };
}

function buildGuest(ticket: TicketOrderRow, zone: StaffCheckinZone): StaffCheckinGuest {
  return {
    code: normalizeTicketCode(ticket.ordercode),
    name: String(ticket.name ?? ""),
    phone: toDisplayPhone(ticket.phone),
    tier: normalizeStaffTicketTier(ticket.ticketClass),
    ticketClass: String(ticket.ticketClass ?? ""),
    zoneId: zone.id,
    zoneName: zone.name,
    checkedIn: isTicketCheckedIn(ticket),
    checkinTime: toIsoString(ticket.checkin_time),
  };
}

async function ensureStaffAccess(): Promise<{ user?: JWTPayload; response?: NextResponse }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { response: json({ message: "Chua dang nhap" }, { status: 401 }) };
  }

  if (!["admin", "receptionist"].includes(currentUser.role)) {
    return { response: json({ message: "Ban khong co quyen su dung staff check-in" }, { status: 403 }) };
  }

  return { user: currentUser };
}

async function findTicketOrder(ticketCode: string, phone: string | null): Promise<TicketOrderRow | null> {
  const db = getDB();
  const normalizedCode = normalizeTicketCode(ticketCode);
  const phoneVariants = phone ? buildPhoneVariants(phone) : [];
  const phoneCondition = phoneVariants.length > 0 ? ` AND phone IN (${phoneVariants.map(() => "?").join(", ")})` : "";

  const [rows] = await db.query<TicketOrderRow[]>(
    `
    SELECT
      id,
      COALESCE(ordercode, '') AS ordercode,
      COALESCE(name, '') AS name,
      COALESCE(phone, '') AS phone,
      COALESCE(class, '') AS ticketClass,
      COALESCE(customer_id, '') AS customerId,
      COALESCE(status, '') AS status,
      COALESCE(is_checkin, 0) AS is_checkin,
      COALESCE(number_checkin, 0) AS number_checkin,
      checkin_time,
      COALESCE(ref, '') AS ref,
      COALESCE(source, '') AS source
    FROM orders
    WHERE ordercode = ?
      ${phoneCondition}
    LIMIT 1
    `,
    [normalizedCode, ...phoneVariants],
  );

  return rows.length > 0 ? rows[0] : null;
}

async function markTicketCheckedIn(ticket: TicketOrderRow, currentUser: JWTPayload, zone: StaffCheckinZone) {
  const db = getDB();
  const now = new Date();
  const nextNumberCheckin = Math.max(1, Number(ticket.number_checkin ?? 0) + 1);

  await db.query(
    `
    UPDATE orders
    SET
      is_checkin = 1,
      number_checkin = ?,
      checkin_time = ?,
      ref = ?,
      source = ?,
      updated_by = ?,
      updated_at = ?
    WHERE id = ?
    LIMIT 1
    `,
    [nextNumberCheckin, now, zone.id, buildZoneSource(zone), currentUser.username, now, ticket.id],
  );

  return {
    ...ticket,
    is_checkin: 1,
    number_checkin: nextNumberCheckin,
    checkin_time: now,
    ref: zone.id,
    source: buildZoneSource(zone),
  };
}

async function loadSnapshot() {
  const db = getDB();
  const startOfToday = new Date();
  startOfToday.setHours(0, 0, 0, 0);
  const startOfTomorrow = new Date(startOfToday);
  startOfTomorrow.setDate(startOfTomorrow.getDate() + 1);

  const [historyRows] = await db.query<HistoryRow[]>(
    `
    SELECT
      id,
      COALESCE(name, '') AS name,
      COALESCE(phone, '') AS phone,
      COALESCE(ordercode, '') AS ordercode,
      COALESCE(class, '') AS ticketClass,
      ref,
      source,
      checkin_time
    FROM orders
    WHERE COALESCE(is_checkin, 0) = 1
      AND checkin_time IS NOT NULL
    ORDER BY checkin_time DESC, id DESC
    LIMIT 20
    `,
  );

  const [statsRows] = await db.query<StatsRow[]>(
    `
    SELECT
      COALESCE(class, '') AS ticketClass,
      COUNT(*) AS total
    FROM orders
    WHERE COALESCE(is_checkin, 0) = 1
      AND checkin_time >= ?
      AND checkin_time < ?
    GROUP BY COALESCE(class, '')
    `,
    [startOfToday, startOfTomorrow],
  );

  const stats = {
    total: 0,
    standard: 0,
    premium: 0,
    vip: 0,
  };

  for (const row of statsRows) {
    const total = Number(row.total ?? 0);
    const tier = normalizeStaffTicketTier(row.ticketClass);
    stats.total += total;

    if (tier === "VIP") {
      stats.vip += total;
      continue;
    }

    if (tier === "PREMIUM") {
      stats.premium += total;
      continue;
    }

    stats.standard += total;
  }

  const history = historyRows.map((row) => {
    const zoneMeta = parseZoneSource(row.source);

    return {
      id: row.id,
      name: String(row.name ?? ""),
      phone: toDisplayPhone(row.phone),
      code: normalizeTicketCode(row.ordercode),
      tier: normalizeStaffTicketTier(row.ticketClass),
      ticketClass: String(row.ticketClass ?? ""),
      zoneId: row.ref ?? zoneMeta.zoneId,
      zoneName: zoneMeta.zoneName,
      time: toIsoString(row.checkin_time),
      statusLabel: buildCheckinStatusLabel(1),
    };
  });

  return { history, stats };
}

export async function GET() {
  const access = await ensureStaffAccess();
  if (access.response) {
    return access.response;
  }

  try {
    const snapshot = await loadSnapshot();
    return json({ data: snapshot }, { status: 200 });
  } catch (error) {
    console.error("Staff check-in snapshot error:", error);
    return json({ message: "Khong the tai du lieu check-in" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await ensureStaffAccess();
  if (access.response) {
    return access.response;
  }
  if (!access.user) {
    return json({ message: "Chua dang nhap" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as StaffCheckinPayload;
    const zone = getStaffCheckinZone(body.zoneId);
    const parsedPayload = parseStaffQrPayload(body.payload ?? "");
    const manualCode = normalizeTicketCode(body.code);
    const ticketCode = manualCode.length > 0 ? manualCode : (parsedPayload.ticketCode ?? "");
    const phone = toDatabasePhone(body.phone) ?? parsedPayload.phone;

    if (!ticketCode) {
      return json({ data: { status: "error", message: "Vui long nhap ma ve hoac quet QR" } }, { status: 200 });
    }

    const ticket = await findTicketOrder(ticketCode, phone);
    if (!ticket) {
      return json({ data: { status: "error", message: "Khong tim thay ve hop le trong he thong" } }, { status: 200 });
    }

    const guest = buildGuest(ticket, zone);
    if (!zone.tiers.includes(guest.tier)) {
      const snapshot = await loadSnapshot();
      return json(
        {
          data: {
            status: "denied",
            message: `Hang ${guest.tier} khong co quyen vao ${zone.name}`,
            guest,
            ...snapshot,
          },
        },
        { status: 200 },
      );
    }

    if (guest.checkedIn) {
      const snapshot = await loadSnapshot();
      return json(
        {
          data: {
            status: "repeat",
            message: "Khach da check-in truoc do",
            guest,
            ...snapshot,
          },
        },
        { status: 200 },
      );
    }

    const updatedTicket = await markTicketCheckedIn(ticket, access.user, zone);
    const snapshot = await loadSnapshot();

    return json(
      {
        data: {
          status: "success",
          message: "Check-in thanh cong",
          guest: buildGuest(updatedTicket, zone),
          ...snapshot,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Staff check-in error:", error);
    return json({ message: "Khong the xu ly check-in luc nay" }, { status: 500 });
  }
}
