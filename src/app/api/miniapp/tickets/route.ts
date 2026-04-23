/* eslint-disable complexity */
import { NextRequest, NextResponse } from "next/server";

import type { RowDataPacket } from "mysql2/promise";

import { createApiTrace, maskPhoneForLogs, shortIdForLogs } from "@/lib/api-observability";
import { applyCorsHeaders, buildCorsHeaders } from "@/lib/cors";
import { getDB } from "@/lib/db";
import { hasMiniAppUserAccess as sharedHasMiniAppUserAccess } from "@/lib/miniapp-rewards";
import {
  mapMiniAppTicketRow,
  queryMiniAppTicketRowByCode,
  queryMiniAppTicketRowsByPhone,
} from "@/lib/miniapp-tickets";
import { buildPhoneVariants, normalizePhoneDigits, toDatabasePhone } from "@/lib/phone";

type CustomerRow = RowDataPacket & {
  id: number;
  name: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  career: string | null;
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

function jsonWithCors(request: NextRequest, body: unknown, init?: ResponseInit): NextResponse {
  return applyCorsHeaders(request, NextResponse.json(body, init), ["GET", "POST", "OPTIONS"]);
}

function normalizeTicketCode(value: unknown): string {
  return String(value ?? "")
    .trim()
    .toUpperCase();
}

function normalizeMiniAppName(value: unknown): string {
  return String(value ?? "").trim();
}

function buildCustomerId(phone: string): string {
  const digits = normalizePhoneDigits(phone);
  return digits ? `KH${digits}` : "";
}

async function syncCustomerFromMiniAppTicket(value: {
  phone: string;
  name: string;
  email: string;
  gender: string;
  career: string;
}) {
  const db = getDB();
  const now = new Date();
  const customerId = buildCustomerId(value.phone);
  const phoneVariants = buildPhoneVariants(value.phone);
  const phoneSql = phoneVariants.length > 0 ? ` OR phone IN (${phoneVariants.map(() => "?").join(", ")})` : "";
  const [rows] = await db.query<CustomerRow[]>(
    `
    SELECT id, name, phone, email, gender, career, create_time
    FROM customer
    WHERE customer_id = ?${phoneSql}
    ORDER BY id DESC
    LIMIT 1
    `,
    [customerId, ...phoneVariants],
  );
  const existingCustomer = rows.length > 0 ? rows[0] : null;

  if (existingCustomer) {
    await db.query(
      `
      UPDATE customer
      SET
        customer_id = ?,
        name = ?,
        phone = ?,
        email = ?,
        gender = ?,
        career = ?,
        updated_at = NOW()
      WHERE id = ?
      LIMIT 1
      `,
      [
        customerId,
        value.name || existingCustomer.name,
        value.phone,
        value.email || existingCustomer.email,
        value.gender || existingCustomer.gender,
        value.career || existingCustomer.career,
        existingCustomer.id,
      ],
    );
    return;
  }

  await db.query(
    `
    INSERT INTO customer
      (
        customer_id,
        name,
        gender,
        phone,
        email,
        career,
        create_time,
        created_at,
        updated_at
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, NOW(), NOW())
    `,
    [customerId, value.name, value.gender, value.phone, value.email, value.career, now],
  );
}

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: buildCorsHeaders(request, ["GET", "POST", "OPTIONS"]),
  });
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
    const tickets = rows.map((row) => mapMiniAppTicketRow(row)).filter((ticket) => Boolean(ticket.code));
    trace.done({ ticketCount: tickets.length });
    return jsonWithCors(request, { data: tickets }, { status: 200 });
  } catch (error) {
    trace.fail(error);
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
      const tickets = rows.map((row) => mapMiniAppTicketRow(row)).filter((ticket) => Boolean(ticket.code));
      trace.done({ ticketCount: tickets.length });
      return jsonWithCors(request, { data: tickets }, { status: 200 });
    }

    const ticketCode = normalizeTicketCode(body.code);
    if (action !== "claim" || !ticketCode) {
      trace.mark("invalid_claim_request");
      return jsonWithCors(request, { message: "code is required for ticket claim" }, { status: 400 });
    }

    const db = getDB();
    const ticket = await trace.step("query_ticket_by_code", () => queryMiniAppTicketRowByCode(ticketCode));

    if (!ticket) {
      trace.mark("ticket_not_found");
      return jsonWithCors(request, { message: "Ticket code not found" }, { status: 404 });
    }

    const mappedTicket = mapMiniAppTicketRow(ticket);
    if (mappedTicket.checkedIn) {
      trace.mark("ticket_already_checked_in", { ticketId: ticket.id });
      return jsonWithCors(
        request,
        { message: "Ticket already checked in", data: mappedTicket },
        { status: 409 },
      );
    }

    const customerId = buildCustomerId(phone);
    const nextName = name || String(ticket.name ?? "");
    await trace.step("update_order_claim", () =>
      db.query(
        `
        UPDATE orders
        SET
          name = ?,
          phone = ?,
          customer_id = ?,
          updated_by = ?,
          updated_at = NOW()
        WHERE id = ?
        LIMIT 1
        `,
        [nextName, phone, customerId, "zalo-miniapp", ticket.id],
      ),
    );

    await trace.step("sync_customer", () =>
      syncCustomerFromMiniAppTicket({
        phone,
        name: nextName,
        email: "",
        gender: "",
        career: "",
      }),
    );

    const claimedTicket = mapMiniAppTicketRow({
      ...ticket,
      name: nextName,
      phone,
    });
    trace.done({
      ticketId: ticket.id,
      claimedCode: shortIdForLogs(claimedTicket.code),
    });

    return jsonWithCors(request, { data: claimedTicket }, { status: 200 });
  } catch (error) {
    return jsonWithCors(request, { message: "Unable to update ticket code" }, { status: 500 });
  }
}
