/* eslint-disable complexity, max-lines */
import { NextRequest, NextResponse } from "next/server";

import type { RowDataPacket } from "mysql2/promise";

import { createApiTrace, maskPhoneForLogs, shortIdForLogs } from "@/lib/api-observability";
import { applyCorsHeaders, buildCorsHeaders } from "@/lib/cors";
import { getDB } from "@/lib/db";
import { hasMiniAppUserAccess as sharedHasMiniAppUserAccess } from "@/lib/miniapp-rewards";
import { mapMiniAppTicketRow, queryMiniAppTicketRowsByPhone, type MiniAppTicketRow } from "@/lib/miniapp-tickets";
import { buildPhoneVariants, normalizePhoneDigits, toDatabasePhone, toDisplayPhone } from "@/lib/phone";
import {
  buildTicketOrderNote,
  CHECKIN_DONE_STATUS,
  parseTicketOrderNote,
  TICKET_ORDER_BRAND,
  TICKET_ORDER_CHANNEL,
} from "@/lib/ticket-orders";

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
      AND COALESCE(phone, '') IN (${placeholders})
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

function isTransferLockedForViewer(row: MiniAppTicketRow, viewerPhone?: string): boolean {
  const meta = parseTicketOrderNote(row.note);
  const viewerDigits = normalizeDigits(viewerPhone);
  const holderDigits = normalizeDigits(row.phone);
  const buyerDigits = normalizeDigits(row.buyer_phone ?? meta.buyer_phone);

  return Boolean(
    viewerDigits && buyerDigits && viewerDigits === buyerDigits && holderDigits && holderDigits !== viewerDigits,
  );
}

function mapTicketRow(row: MiniAppTicketRow, viewerPhone?: string) {
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
    buyerPhone: toDisplayPhone(row.buyer_phone ?? meta.buyer_phone),
    holderName: meta.holder_name ?? String(row.name ?? ""),
    holderPhone: toDisplayPhone(meta.holder_phone ?? row.phone),
  };
}

async function queryTicketRowsByPhone(phone: string): Promise<MiniAppTicketRow[]> {
  const db = getDB();
  const phoneVariants = buildPhoneVariants(phone);
  const placeholders = phoneVariants.map(() => "?").join(", ");
  const [rows] = await db.query<MiniAppTicketRow[]>(
    `
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
      AND TRIM(order_ID) <> ''
      AND (
        COALESCE(phone, '') IN (${placeholders})
        OR COALESCE(buyer_phone, '') IN (${placeholders})
      )
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
  const trace = createApiTrace("miniapp/tickets.GET", {
    zid: shortIdForLogs(zid),
    phone: maskPhoneForLogs(phone),
  });

  if (!zid || !phoneVariants.length) {
    trace.mark("invalid_request");
    return jsonWithCors(request, { message: "zid and phone are required", data: [] }, { status: 400 });
  }

  const hasAccess = await trace.step("access_check", () => sharedHasMiniAppUserAccess(zid, phone));
  if (!hasAccess) {
    trace.mark("access_denied");
    return jsonWithCors(request, { message: "Mini app account is not authorized", data: [] }, { status: 403 });
  }

  try {
    const rows = await trace.step("query_ticket_rows", () => queryMiniAppTicketRowsByPhone(phone));
    const tickets = rows.map((row) => mapMiniAppTicketRow(row, phone)).filter((ticket) => Boolean(ticket.code));
    trace.mark("map_ticket_rows", {
      rowCount: rows.length,
      ticketCount: tickets.length,
    });
    trace.done({ ticketCount: tickets.length });

    return jsonWithCors(request, { data: tickets }, { status: 200 });
  } catch (error) {
    trace.fail(error);
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
    const trace = createApiTrace("miniapp/tickets.POST", {
      action,
      zid: shortIdForLogs(zid),
      phone: maskPhoneForLogs(phone),
      ticketCode: shortIdForLogs(body.code),
    });

    if (!phone || !zid) {
      trace.mark("invalid_request");
      return jsonWithCors(request, { message: "id and phone are required" }, { status: 400 });
    }

    const hasAccess = await trace.step("access_check", () => sharedHasMiniAppUserAccess(zid, phone));
    if (!hasAccess) {
      trace.mark("access_denied");
      return jsonWithCors(request, { message: "Mini app account is not authorized" }, { status: 403 });
    }

    if (action === "list") {
      const rows = await trace.step("query_ticket_rows", () => queryMiniAppTicketRowsByPhone(phone));
      const tickets = rows.map((row) => mapMiniAppTicketRow(row, phone)).filter((ticket) => Boolean(ticket.code));
      trace.mark("map_ticket_rows", {
        rowCount: rows.length,
        ticketCount: tickets.length,
      });
      trace.done({ ticketCount: tickets.length });
      return jsonWithCors(request, { data: tickets }, { status: 200 });
    }

    const ticketCode = normalizeTicketCode(body.code);
    if (action !== "claim" || !ticketCode) {
      trace.mark("invalid_claim_request");
      return jsonWithCors(request, { message: "code is required for ticket claim" }, { status: 400 });
    }

    const db = getDB();
    const [rows] = await trace.step("query_ticket_by_code", () =>
      db.query<MiniAppTicketRow[]>(
        `
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
        WHERE order_ID = ?
          AND kenh_ban = ?
        LIMIT 1
        `,
        [ticketCode, TICKET_ORDER_CHANNEL],
      ),
    );
    const ticket = rows.length > 0 ? rows[0] : null;

    if (!ticket) {
      trace.mark("ticket_not_found");
      return jsonWithCors(request, { message: "Ticket code not found" }, { status: 404 });
    }

    const transferLocked = isTransferLockedForViewer(ticket, phone);
    if (transferLocked) {
      trace.mark("ticket_transfer_locked", { ticketId: ticket.id });
      return jsonWithCors(
        request,
        { message: "Ticket da chuyen cho nguoi khac", data: mapMiniAppTicketRow(ticket, phone) },
        { status: 409 },
      );
    }

    const ticketMeta = parseTicketOrderNote(ticket.note);
    const checkedIn = ticketMeta.is_checkin === 1 || ticketMeta.status_checkin === CHECKIN_DONE_STATUS;
    if (checkedIn) {
      trace.mark("ticket_already_checked_in", { ticketId: ticket.id });
      return jsonWithCors(
        request,
        { message: "Ticket already checked in", data: mapMiniAppTicketRow(ticket, phone) },
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
      buyer_phone: ticket.buyer_phone ?? ticketMeta.buyer_phone ?? ticket.phone,
      holder_name: nextName,
      holder_phone: phone,
      claimed_from_name: String(ticket.name ?? ""),
      claimed_from_phone: ticket.phone,
      claimed_at: now.toISOString(),
    });

    await trace.step("update_order_claim", () =>
      db.query(
        `
        UPDATE orders
        SET
          name_customer = ?,
          phone = ?,
          buyer_phone = ?,
          customer_ID = ?,
          note = ?,
          updated_by = ?,
          updated_at = ?
        WHERE id = ?
        LIMIT 1
        `,
        [
          nextName,
          phone,
          ticket.buyer_phone ?? ticketMeta.buyer_phone ?? ticket.phone,
          customerId,
          nextNote,
          "zalo-miniapp",
          now,
          ticket.id,
        ],
      ),
    );

    await trace.step("sync_customer", () =>
      syncCustomerFromMiniAppTicket({
        phone,
        name: nextName,
        ticketClass,
        zid,
        avatar,
        ticketCode,
      }),
    );

    const claimedTicket = mapMiniAppTicketRow(
      {
        ...ticket,
        name: nextName,
        phone,
        buyer_phone: ticket.buyer_phone ?? ticketMeta.buyer_phone ?? ticket.phone,
        note: nextNote,
      },
      phone,
    );
    trace.done({
      ticketId: ticket.id,
      claimedCode: shortIdForLogs(claimedTicket.code),
    });

    return jsonWithCors(request, { data: claimedTicket }, { status: 200 });
  } catch (error) {
    console.error("Mini app ticket claim error:", error);
    return jsonWithCors(request, { message: "Unable to update ticket code" }, { status: 500 });
  }
}
