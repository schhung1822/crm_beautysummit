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
  checked_zones: string | null;
};

type HistoryRow = RowDataPacket & {
  id: number;
  name: string | null;
  phone: string | null;
  ordercode: string | null;
  ticketClass: string | null;
  zoneId: string | null;
  zoneName: string | null;
  checkin_time: Date | string | null;
};

type StatsRow = RowDataPacket & {
  ticketClass: string | null;
  checkedInCount: number | string | null;
  totalCount: number | string | null;
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

function maskPhoneString(phoneValue: string | null | undefined): string {
  const display = toDisplayPhone(phoneValue);
  if (!display) return "";
  if (display.length >= 7) {
    return display.slice(0, 3) + "***" + display.slice(-3);
  }
  return "***";
}

function buildGuest(ticket: TicketOrderRow, zone: StaffCheckinZone): StaffCheckinGuest {
  const refRaw = String(ticket.ref ?? "");
  const checkedZonesRaw = String(ticket.checked_zones ?? "");

  const checkedZoneArray = checkedZonesRaw.split(",").map((value) => value.trim()).filter(Boolean);
  const refZoneArray = refRaw.split(",").map((value) => value.trim()).filter(Boolean);

  const isInCheckedZones = checkedZoneArray.includes(String(zone.id));
  const isInRefZones = refZoneArray.includes(String(zone.id));
  const hasCheckedInCurrentZone = isInCheckedZones || isInRefZones;

  return {
    code: normalizeTicketCode(ticket.ordercode),
    name: String(ticket.name ?? ""),
    phone: maskPhoneString(ticket.phone),
    tier: normalizeStaffTicketTier(ticket.ticketClass),
    ticketClass: String(ticket.ticketClass ?? ""),
    zoneId: zone.id,
    zoneName: zone.name,
    checkedIn: hasCheckedInCurrentZone,
    checkinTime: toIsoString(ticket.checkin_time),
  };
}

async function ensureStaffAccess(): Promise<{ user?: JWTPayload; response?: NextResponse }> {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return { response: json({ message: "Chua dang nhap" }, { status: 401 }) };
  }

  if (!["admin", "staff"].includes(currentUser.role)) {
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
      COALESCE(source, '') AS source,
      (SELECT GROUP_CONCAT(zone_id) FROM checkin_log WHERE order_id = orders.id) AS checked_zones
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

  const prevRef = String(ticket.ref ?? "");
  const newRef = prevRef ? `${prevRef},${zone.id}` : zone.id;
  const preservedSource = String(ticket.source ?? "").trim();

  await db.query(
    `INSERT INTO checkin_log (order_id, ordercode, zone_id, zone_name, source, created_by)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [ticket.id, ticket.ordercode, zone.id, zone.name, preservedSource || null, currentUser.username]
  );

  await db.query(
    `
    UPDATE orders
    SET
      is_checkin = 1,
      number_checkin = ?,
      checkin_time = ?,
      ref = ?,
      updated_by = ?,
      updated_at = ?
    WHERE id = ?
    LIMIT 1
    `,
    [nextNumberCheckin, now, newRef, currentUser.username, now, ticket.id],
  );

  return {
    ...ticket,
    is_checkin: 1,
    number_checkin: nextNumberCheckin,
    checkin_time: now,
    ref: newRef,
    source: ticket.source,
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
      l.id,
      COALESCE(o.name, '') AS name,
      COALESCE(o.phone, '') AS phone,
      COALESCE(l.ordercode, o.ordercode, '') AS ordercode,
      COALESCE(o.class, '') AS ticketClass,
      COALESCE(l.zone_id, '') AS zoneId,
      COALESCE(l.zone_name, '') AS zoneName,
      l.checkin_time
    FROM checkin_log l
    LEFT JOIN orders o ON l.order_id = o.id
    ORDER BY l.checkin_time DESC, l.id DESC
    LIMIT 20
    `,
  );

  const [statsRows] = await db.query<StatsRow[]>(
    `
    SELECT
      COALESCE(class, '') AS ticketClass,
      SUM(CASE WHEN COALESCE(is_checkin, 0) = 1 AND checkin_time >= ? AND checkin_time < ? THEN 1 ELSE 0 END) AS checkedInCount,
      COUNT(*) AS totalCount
    FROM orders
    GROUP BY COALESCE(class, '')
    `,
    [startOfToday, startOfTomorrow],
  );

  const stats = {
    total: { current: 0, max: 0 },
    gold: { current: 0, max: 0 },
    ruby: { current: 0, max: 0 },
    vip: { current: 0, max: 0 },
  };

  for (const row of statsRows) {
    const checked = Number(row.checkedInCount ?? 0);
    const max = Number(row.totalCount ?? 0);
    const tier = normalizeStaffTicketTier(row.ticketClass);

    stats.total.current += checked;
    stats.total.max += max;

    if (tier === "VIP") {
      stats.vip.current += checked;
      stats.vip.max += max;
      continue;
    }

    if (tier === "RUBY") {
      stats.ruby.current += checked;
      stats.ruby.max += max;
      continue;
    }

    stats.gold.current += checked;
    stats.gold.max += max;
  }

  const history = historyRows.map((row) => ({
    id: row.id,
    name: String(row.name ?? ""),
    phone: maskPhoneString(row.phone),
    code: normalizeTicketCode(row.ordercode),
    tier: normalizeStaffTicketTier(row.ticketClass),
    ticketClass: String(row.ticketClass ?? ""),
    zoneId: String(row.zoneId ?? ""),
    zoneName: String(row.zoneName ?? ""),
    time: toIsoString(row.checkin_time),
    statusLabel: buildCheckinStatusLabel(1),
  }));

  const [zonesRows] = await db.query(
    "SELECT id, name, allowed_tiers, event_date FROM checkin_locations WHERE is_active = 1 ORDER BY nc_order ASC, id ASC"
  ) as any[];

  const colors = ["#C41E7F", "#8B5CF6", "#0EA5E9", "#F59E0B", "#10B981", "#EF4444"];
  const zones: StaffCheckinZone[] = zonesRows.map((r: any, i: number) => ({
    id: String(r.id),
    name: r.name,
    color: colors[i % colors.length] as string,
    tiers: String(r.allowed_tiers || "").split(",").map(t => t.trim()) as StaffCheckinTier[],
    eventDate: r.event_date ? toIsoString(r.event_date) : null,
  }));

  return { history, stats, zones };
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
    return json({ message: "Không thể tải dữ liệu check-in" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  const access = await ensureStaffAccess();
  if (access.response) {
    return access.response;
  }
  if (!access.user) {
    return json({ message: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const body = (await request.json()) as StaffCheckinPayload;
    
    // fetch snapshot ahead to get zones and also reuse for return
    let currentSnapshot = await loadSnapshot();
    const zoneIdStr = String(body.zoneId || "");
    const zone = currentSnapshot.zones.find(z => z.id === zoneIdStr) ?? currentSnapshot.zones[0];
    if (!zone) {
      return json({ data: { status: "error", message: "Không tìm thấy thông tin địa điểm check-in" } }, { status: 200 });
    }

    const parsedPayload = parseStaffQrPayload(body.payload ?? "");
    const manualCode = normalizeTicketCode(body.code);
    const ticketCode = manualCode.length > 0 ? manualCode : (parsedPayload.ticketCode ?? "");
    const phone = toDatabasePhone(body.phone) ?? parsedPayload.phone;

    if (!ticketCode) {
      return json({ data: { status: "error", message: "Vui lòng nhập mã vé hoặc quét QR" } }, { status: 200 });
    }

    const ticket = await findTicketOrder(ticketCode, phone);
    if (!ticket) {
      return json({ data: { status: "error", message: "Không tìm thấy vé hợp lệ trong hệ thống" } }, { status: 200 });
    }

    const guest = buildGuest(ticket, zone);
    
    console.log("=== CHECKIN DEBUG ===", {
      ticketCode,
      zoneIdStr,
      zoneId: zone.id,
      checkedZones: ticket.checked_zones,
      ref: ticket.ref,
      guestCheckedIn: guest.checkedIn
    });

    if (zone.eventDate) {
      const eventTime = new Date(zone.eventDate).getTime();
      const nowTime = new Date().getTime();
      if (nowTime < eventTime) {
        return json(
          {
            data: {
              status: "denied",
              message: `Chưa đến thời gian check-in của ${zone.name}`,
              guest,
              ...currentSnapshot,
            },
          },
          { status: 200 },
        );
      }
    }

    if (!zone.tiers.includes(guest.tier)) {
      return json(
        {
          data: {
            status: "denied",
            message: `Hạng ${guest.tier} không có quyền vào ${zone.name}`,
            guest,
            ...currentSnapshot,
          },
        },
        { status: 200 },
      );
    }

    if (guest.checkedIn) {
      return json(
        {
          data: {
            status: "repeat",
            message: "Khách đã check-in trước đó",
            guest,
            ...currentSnapshot,
          },
        },
        { status: 200 },
      );
    }

    const updatedTicket = await markTicketCheckedIn(ticket, access.user, zone);
    currentSnapshot = await loadSnapshot();

    return json(
      {
        data: {
          status: "success",
          message: "Check-in thành công",
          guest: buildGuest(updatedTicket, zone),
          ...currentSnapshot,
        },
      },
      { status: 200 },
    );
  } catch (error) {
    console.error("Staff check-in error:", error);
    return json({ message: "Không thể xử lý check-in lúc này" }, { status: 500 });
  }
}
