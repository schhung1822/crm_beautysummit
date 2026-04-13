/* eslint-disable complexity, max-lines */
import { NextRequest, NextResponse } from "next/server";

import type { RowDataPacket } from "mysql2/promise";

import { getCurrentUser, type JWTPayload } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { buildPhoneVariants, toDatabasePhone, toDisplayPhone } from "@/lib/phone";
import {
  buildStaffCheckinEventName,
  getStaffCheckinZone,
  normalizeStaffTicketTier,
  normalizeTicketCode,
  parseStaffQrPayload,
  STAFF_CHECKIN_EVENT_PREFIX,
  type StaffCheckinTier,
  type StaffCheckinZone,
} from "@/lib/staff-checkin";
import {
  buildTicketOrderNote,
  CHECKIN_DONE_STATUS,
  parseTicketOrderNote,
  TICKET_ORDER_CHANNEL,
} from "@/lib/ticket-orders";

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
  note: string | null;
};

type CheckinHistoryRow = RowDataPacket & {
  id: number;
  name: string | null;
  phone: string | null;
  ticketCode: string | null;
  ticketClass: string | null;
  zoneId: string | null;
  zoneName: string | null;
  submit_time: Date | string | null;
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

function buildGuest(ticket: TicketOrderRow, zone: StaffCheckinZone): StaffCheckinGuest {
  const meta = parseTicketOrderNote(ticket.note);
  const checkedIn = meta.is_checkin === 1 || meta.status_checkin === CHECKIN_DONE_STATUS;

  return {
    code: normalizeTicketCode(ticket.ordercode),
    name: String(ticket.name ?? ""),
    phone: toDisplayPhone(ticket.phone),
    tier: normalizeStaffTicketTier(ticket.ticketClass),
    ticketClass: String(ticket.ticketClass ?? ""),
    zoneId: zone.id,
    zoneName: zone.name,
    checkedIn,
    checkinTime: meta.checkin_time,
  };
}

async function ensureStaffAccess(): Promise<{ user?: JWTPayload; response?: NextResponse }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return {
      response: json({ message: "Chua dang nhap" }, { status: 401 }),
    };
  }

  if (!["admin", "receptionist"].includes(currentUser.role)) {
    return {
      response: json({ message: "Ban khong co quyen su dung staff check-in" }, { status: 403 }),
    };
  }

  return { user: currentUser };
}

async function findTicketOrder(ticketCode: string, phone: string | null): Promise<TicketOrderRow | null> {
  const db = getDB();
  const normalizedCode = normalizeTicketCode(ticketCode);
  const phoneVariants = phone ? buildPhoneVariants(phone) : [];
  const phoneCondition =
    phoneVariants.length > 0 ? ` AND COALESCE(phone, '') IN (${phoneVariants.map(() => "?").join(", ")})` : "";

  const [rows] = await db.query<TicketOrderRow[]>(
    `
    SELECT
      id,
      COALESCE(order_ID, '') AS ordercode,
      COALESCE(name_customer, '') AS name,
      COALESCE(phone, '') AS phone,
      COALESCE(brand_pro, '') AS ticketClass,
      COALESCE(customer_ID, '') AS customerId,
      note
    FROM orders
    WHERE order_ID = ?
      AND kenh_ban = ?
      ${phoneCondition}
    LIMIT 1
    `,
    [normalizedCode, TICKET_ORDER_CHANNEL, ...phoneVariants],
  );

  return rows.length > 0 ? rows[0] : null;
}

async function markTicketCheckedIn(ticket: TicketOrderRow, currentUser: JWTPayload, zone: StaffCheckinZone) {
  const db = getDB();
  const meta = parseTicketOrderNote(ticket.note);
  const now = new Date();
  const nextNote = buildTicketOrderNote({
    ...meta,
    status_checkin: CHECKIN_DONE_STATUS,
    checkin_time: now.toISOString(),
    is_checkin: 1,
    source: `staff-checkin:${zone.id}`,
  });

  await db.query(
    `
    UPDATE orders
    SET
      note = ?,
      updated_by = ?,
      updated_at = ?
    WHERE id = ?
    LIMIT 1
    `,
    [nextNote, currentUser.username, now, ticket.id],
  );

  return {
    ...ticket,
    note: nextNote,
  };
}

async function insertCheckinLog(ticket: TicketOrderRow, zone: StaffCheckinZone, currentUser: JWTPayload) {
  const db = getDB();
  const now = new Date();
  const tier = normalizeStaffTicketTier(ticket.ticketClass);

  await db.query(
    `
    INSERT INTO checkin
      (
        phone,
        event_name,
        name,
        title_q1,
        q1,
        title_q2,
        q2,
        title_q3,
        q3,
        title_q4,
        q4,
        title_q5,
        q5,
        user_id,
        submit_time,
        create_time,
        created_by,
        updated_by,
        created_at,
        updated_at
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      toDatabasePhone(ticket.phone) ?? "",
      buildStaffCheckinEventName(zone),
      String(ticket.name ?? ""),
      "ticket_code",
      normalizeTicketCode(ticket.ordercode),
      "ticket_class",
      tier,
      "zone_id",
      zone.id,
      "zone_name",
      zone.name,
      "source",
      "staff-checkin",
      String(ticket.customerId ?? normalizeTicketCode(ticket.ordercode)),
      now,
      now,
      currentUser.username,
      currentUser.username,
      now,
      now,
    ],
  );
}

async function loadSnapshot() {
  const db = getDB();
  const likePattern = `${STAFF_CHECKIN_EVENT_PREFIX} | %`;

  const [historyRows] = await db.query<CheckinHistoryRow[]>(
    `
    SELECT
      id,
      COALESCE(name, '') AS name,
      COALESCE(phone, '') AS phone,
      COALESCE(q1, '') AS ticketCode,
      COALESCE(q2, '') AS ticketClass,
      COALESCE(q3, '') AS zoneId,
      COALESCE(q4, '') AS zoneName,
      submit_time
    FROM checkin
    WHERE event_name LIKE ?
    ORDER BY submit_time DESC, id DESC
    LIMIT 20
    `,
    [likePattern],
  );

  const [statsRows] = await db.query<StatsRow[]>(
    `
    SELECT
      COALESCE(q2, '') AS ticketClass,
      COUNT(*) AS total
    FROM checkin
    WHERE event_name LIKE ?
      AND DATE(submit_time) = CURDATE()
    GROUP BY COALESCE(q2, '')
    `,
    [likePattern],
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

  const history = historyRows.map((row) => ({
    id: row.id,
    name: String(row.name ?? ""),
    phone: toDisplayPhone(row.phone),
    code: normalizeTicketCode(row.ticketCode),
    tier: normalizeStaffTicketTier(row.ticketClass),
    ticketClass: String(row.ticketClass ?? ""),
    zoneId: String(row.zoneId ?? ""),
    zoneName: String(row.zoneName ?? ""),
    time: toIsoString(row.submit_time),
  }));

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
      return json(
        {
          data: {
            status: "error",
            message: "Khong tim thay ve hop le trong he thong",
          },
        },
        { status: 200 },
      );
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
    await insertCheckinLog(updatedTicket, zone, access.user);
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
