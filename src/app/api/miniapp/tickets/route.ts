/* eslint-disable complexity, max-lines */
import { NextRequest, NextResponse } from "next/server";

import type { RowDataPacket } from "mysql2/promise";

import { applyCorsHeaders, buildCorsHeaders } from "@/lib/cors";
import { getDB } from "@/lib/db";
import { buildPhoneVariants, normalizePhoneDigits, toDatabasePhone, toDisplayPhone } from "@/lib/phone";
import {
  buildTicketOrderNote,
  CHECKIN_DONE_STATUS,
  parseTicketOrderNote,
  TICKET_ORDER_BRAND,
  TICKET_ORDER_CHANNEL,
} from "@/lib/ticket-orders";

type TicketOrderRow = RowDataPacket & {
  id: number;
  ordercode: string | null;
  name: string | null;
  phone: string | null;
  ticketClass: string | null;
  status: string | null;
  create_time: Date | string | null;
  note: string | null;
};

type CustomerRow = RowDataPacket & {
  id: number;
  name: string | null;
  phone: string | null;
  class: string | null;
  create_time: Date | null;
};

type MiniAppTicketsPayload = {
  action?: string;
  code?: string;
  id?: string;
  name?: string;
  phone?: string;
  avatar?: string;
};

type UserAccessRow = RowDataPacket & {
  id: number;
};

const DEFAULT_ZALO_SDK_NAME = "User Name";

const normalizedPhoneSql =
  "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(phone, ''), ' ', ''), '-', ''), '.', ''), '+', ''), '(', ''), ')', '')";
const normalizedBuyerPhoneSql =
  "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(COALESCE(CASE WHEN JSON_VALID(note) THEN JSON_UNQUOTE(JSON_EXTRACT(note, '$.buyer_phone')) ELSE '' END, ''), ' ', ''), '-', ''), '.', ''), '+', ''), '(', ''), ')', '')";

function jsonWithCors(request: NextRequest, body: unknown, init?: ResponseInit): NextResponse {
  return applyCorsHeaders(request, NextResponse.json(body, init), ["GET", "POST", "OPTIONS"]);
}

function normalizeDigits(value: unknown): string {
  return normalizePhoneDigits(value);
}

function normalizeTicketCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeMiniAppName(value: unknown): string {
  const normalizedValue = String(value ?? "").trim();
  if (!normalizedValue || normalizedValue === DEFAULT_ZALO_SDK_NAME) {
    return "";
  }

  return normalizedValue;
}

function buildCustomerId(phone: string): string {
  const digits = normalizeDigits(phone);
  return digits ? `KH${digits}` : "";
}

function buildCustomerNote(value: { zid: string; avatar: string; ticketCode: string }): string {
  return [
    `Source: ${TICKET_ORDER_BRAND} Mini App`,
    `Zalo ID: ${value.zid}`,
    `Avatar: ${value.avatar}`,
    `Ticket: ${value.ticketCode}`,
  ].join("\n");
}

async function hasMiniAppUserAccess(zid: string, phone: string): Promise<boolean> {
  const db = getDB();
  const phoneVariants = buildPhoneVariants(phone);
  if (!zid.trim() || phoneVariants.length === 0) {
    return false;
  }

  const placeholders = phoneVariants.map(() => "?").join(", ");
  const [rows] = await db.query<UserAccessRow[]>(
    `
    SELECT id
    FROM user
    WHERE zid = ?
      AND ${normalizedPhoneSql} IN (${placeholders})
    LIMIT 1
    `,
    [zid.trim(), ...phoneVariants],
  );

  return rows.length > 0;
}

function toIsoString(value: Date | string | null): string | null {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
}

function isTransferLockedForViewer(row: TicketOrderRow, viewerPhone?: string): boolean {
  const meta = parseTicketOrderNote(row.note);
  const viewerDigits = normalizeDigits(viewerPhone);
  const holderDigits = normalizeDigits(row.phone);
  const buyerDigits = normalizeDigits(meta.buyer_phone);

  return Boolean(
    viewerDigits && buyerDigits && viewerDigits === buyerDigits && holderDigits && holderDigits !== viewerDigits,
  );
}

function mapTicketRow(row: TicketOrderRow, viewerPhone?: string) {
  const meta = parseTicketOrderNote(row.note);
  const checkedIn = meta.is_checkin === 1 || meta.status_checkin === CHECKIN_DONE_STATUS;
  const transferLocked = isTransferLockedForViewer(row, viewerPhone);

  return {
    code: String(row.ordercode ?? "").trim(),
    name: String(row.name ?? ""),
    phone: toDisplayPhone(row.phone),
    ticketClass: String(row.ticketClass ?? ""),
    status: checkedIn ? "checked_in" : "pending",
    statusLabel: transferLocked ? "Da chuyen ve" : checkedIn ? "Đã check-in" : "Chưa check-in",
    checkedIn,
    disabled: transferLocked,
    transferLocked,
    canOpen: !transferLocked,
    checkinTime: meta.checkin_time,
    createdAt: toIsoString(row.create_time),
    buyerName: meta.buyer_name ?? "",
    buyerPhone: toDisplayPhone(meta.buyer_phone),
    holderName: meta.holder_name ?? String(row.name ?? ""),
    holderPhone: toDisplayPhone(meta.holder_phone ?? row.phone),
  };
}

async function queryTicketRowsByPhone(phone: string): Promise<TicketOrderRow[]> {
  const db = getDB();
  const phoneVariants = buildPhoneVariants(phone);
  const placeholders = phoneVariants.map(() => "?").join(", ");
  const [rows] = await db.query<TicketOrderRow[]>(
    `
    SELECT
      id,
      COALESCE(order_ID, '') AS ordercode,
      COALESCE(name_customer, '') AS name,
      COALESCE(phone, '') AS phone,
      COALESCE(brand_pro, '') AS ticketClass,
      COALESCE(status, '') AS status,
      create_time,
      note
    FROM orders
    WHERE kenh_ban = ?
      AND order_ID IS NOT NULL
      AND TRIM(order_ID) <> ''
      AND (${normalizedPhoneSql} IN (${placeholders}) OR ${normalizedBuyerPhoneSql} IN (${placeholders}))
    ORDER BY create_time DESC
    LIMIT 50
    `,
    [TICKET_ORDER_CHANNEL, ...phoneVariants, ...phoneVariants],
  );

  return rows;
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request, ["GET", "POST", "OPTIONS"]),
  });
}

async function syncCustomerFromMiniAppTicket(value: {
  phone: string;
  name: string;
  ticketClass: string;
  zid: string;
  avatar: string;
  ticketCode: string;
}) {
  const db = getDB();
  const now = new Date();
  const customerId = buildCustomerId(value.phone);
  const phoneVariants = buildPhoneVariants(value.phone);
  const phoneSql = phoneVariants.length > 0 ? ` OR phone IN (${phoneVariants.map(() => "?").join(", ")})` : "";
  const [rows] = await db.query<CustomerRow[]>(
    `
    SELECT id, name, phone, class, create_time
    FROM customer
    WHERE customer_ID = ?${phoneSql}
    ORDER BY id DESC
    LIMIT 1
    `,
    [customerId, ...phoneVariants],
  );
  const existingCustomer = rows.length > 0 ? rows[0] : null;
  const note = buildCustomerNote({
    zid: value.zid,
    avatar: value.avatar,
    ticketCode: value.ticketCode,
  });

  if (existingCustomer) {
    await db.query(
      `
      UPDATE customer
      SET
        customer_ID = ?,
        name = ?,
        phone = ?,
        class = ?,
        note = ?,
        branch = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ?
      LIMIT 1
      `,
      [
        customerId,
        value.name || existingCustomer.name,
        value.phone,
        value.ticketClass || existingCustomer.class,
        note,
        TICKET_ORDER_BRAND,
        "zalo-miniapp",
        now,
        existingCustomer.id,
      ],
    );
    return;
  }

  await db.query(
    `
    INSERT INTO customer
      (
        customer_ID,
        name,
        phone,
        class,
        note,
        branch,
        created_by,
        updated_by,
        create_time,
        created_at,
        updated_at
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      customerId,
      value.name,
      value.phone,
      value.ticketClass,
      note,
      TICKET_ORDER_BRAND,
      "zalo-miniapp",
      "zalo-miniapp",
      now,
      now,
      now,
    ],
  );
}

export async function GET(request: NextRequest) {
  const phone = request.nextUrl.searchParams.get("phone")?.trim() ?? "";
  const zid = request.nextUrl.searchParams.get("zid")?.trim() ?? "";
  const phoneVariants = buildPhoneVariants(phone);

  if (!zid || !phoneVariants.length) {
    return jsonWithCors(request, { message: "zid and phone are required", data: [] }, { status: 400 });
  }

  const hasAccess = await hasMiniAppUserAccess(zid, phone);
  if (!hasAccess) {
    return jsonWithCors(request, { message: "Mini app account is not authorized", data: [] }, { status: 403 });
  }

  try {
    const rows = await queryTicketRowsByPhone(phone);
    const tickets = rows.map((row) => mapTicketRow(row, phone)).filter((ticket) => Boolean(ticket.code));

    return jsonWithCors(request, { data: tickets }, { status: 200 });
  } catch (error) {
    console.error("Mini app ticket lookup error:", error);
    return jsonWithCors(request, { message: "Unable to load ticket orders", data: [] }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MiniAppTicketsPayload;
    const action = String(body.action ?? (body.code ? "claim" : "list"))
      .trim()
      .toLowerCase();
    const phone = toDatabasePhone(body.phone) ?? "";
    const zid = String(body.id ?? "").trim();
    const name = normalizeMiniAppName(body.name);
    const avatar = String(body.avatar ?? "").trim();

    if (!phone || !zid) {
      return jsonWithCors(request, { message: "id and phone are required" }, { status: 400 });
    }

    const hasAccess = await hasMiniAppUserAccess(zid, phone);
    if (!hasAccess) {
      return jsonWithCors(request, { message: "Mini app account is not authorized" }, { status: 403 });
    }

    if (action === "list") {
      const rows = await queryTicketRowsByPhone(phone);
      const tickets = rows.map((row) => mapTicketRow(row, phone)).filter((ticket) => Boolean(ticket.code));
      return jsonWithCors(request, { data: tickets }, { status: 200 });
    }

    const ticketCode = normalizeTicketCode(body.code);
    if (action !== "claim" || !ticketCode) {
      return jsonWithCors(request, { message: "code is required for ticket claim" }, { status: 400 });
    }

    const db = getDB();
    const [rows] = await db.query<TicketOrderRow[]>(
      `
      SELECT
        id,
        COALESCE(order_ID, '') AS ordercode,
        COALESCE(name_customer, '') AS name,
        COALESCE(phone, '') AS phone,
        COALESCE(brand_pro, '') AS ticketClass,
        COALESCE(status, '') AS status,
        create_time,
        note
      FROM orders
      WHERE order_ID = ?
        AND kenh_ban = ?
      LIMIT 1
      `,
      [ticketCode, TICKET_ORDER_CHANNEL],
    );
    const ticket = rows.length > 0 ? rows[0] : null;

    if (!ticket) {
      return jsonWithCors(request, { message: "Ticket code not found" }, { status: 404 });
    }

    const transferLocked = isTransferLockedForViewer(ticket, phone);
    if (transferLocked) {
      return jsonWithCors(
        request,
        { message: "Ticket da chuyen cho nguoi khac", data: mapTicketRow(ticket, phone) },
        { status: 409 },
      );
    }

    const ticketMeta = parseTicketOrderNote(ticket.note);
    const checkedIn = ticketMeta.is_checkin === 1 || ticketMeta.status_checkin === CHECKIN_DONE_STATUS;
    if (checkedIn) {
      return jsonWithCors(
        request,
        { message: "Ticket already checked in", data: mapTicketRow(ticket, phone) },
        { status: 409 },
      );
    }

    const now = new Date();
    const customerId = buildCustomerId(phone);
    const ticketClass = String(ticket.ticketClass ?? "");
    const nextName = name || String(ticket.name ?? "");
    const nextNote = buildTicketOrderNote({
      ...ticketMeta,
      source: "zalo-miniapp",
      buyer_name: ticketMeta.buyer_name ?? String(ticket.name ?? ""),
      buyer_phone: ticketMeta.buyer_phone ?? ticket.phone,
      holder_name: nextName,
      holder_phone: phone,
      claimed_from_name: String(ticket.name ?? ""),
      claimed_from_phone: ticket.phone,
      claimed_at: now.toISOString(),
    });

    await db.query(
      `
      UPDATE orders
      SET
        name_customer = ?,
        phone = ?,
        customer_ID = ?,
        note = ?,
        updated_by = ?,
        updated_at = ?
      WHERE id = ?
      LIMIT 1
      `,
      [nextName, phone, customerId, nextNote, "zalo-miniapp", now, ticket.id],
    );

    await syncCustomerFromMiniAppTicket({
      phone,
      name: nextName,
      ticketClass,
      zid,
      avatar,
      ticketCode,
    });

    const claimedTicket = mapTicketRow(
      {
        ...ticket,
        name: nextName,
        phone,
        note: nextNote,
      },
      phone,
    );

    return jsonWithCors(request, { data: claimedTicket }, { status: 200 });
  } catch (error) {
    console.error("Mini app ticket claim error:", error);
    return jsonWithCors(request, { message: "Unable to update ticket code" }, { status: 500 });
  }
}
