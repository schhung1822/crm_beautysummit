/* eslint-disable complexity, max-lines */
import { NextResponse } from "next/server";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { getDB } from "@/lib/db";
import {
  buildTicketOrderNote,
  CHECKIN_DONE_STATUS,
  CHECKIN_PENDING_STATUS,
  TICKET_ORDER_BRAND,
  TICKET_ORDER_CHANNEL,
  TICKET_PRODUCT_ID,
  TICKET_PRODUCT_NAME,
} from "@/lib/ticket-orders";

type NormalizedOrderPayload = {
  ordercode: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  class: string | null;
  money: number;
  money_VAT: number;
  status: string;
  is_gift: number;
  update_time: Date;
  create_time: Date;
  is_checkin: number;
  number_checkin: number;
  checkin_time: Date | null;
  career: string | null;
  hope: string | null;
  ref: string | null;
  source: string | null;
  send_noti: number;
  customer_id: string | null;
  voucher: string | null;
  voucher_status: string | null;
  status_checkin: string;
};

function toNullableString(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  return normalized.length ? normalized : null;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  const parsed = typeof value === "number" ? value : Number(String(value).replaceAll(",", ""));
  return Number.isFinite(parsed) ? parsed : null;
}

function toNullableInteger(value: unknown) {
  const parsed = toNullableNumber(value);
  if (parsed === null) {
    return null;
  }

  return Math.max(0, Math.trunc(parsed));
}

function toNullableBoolean(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return null;
  }

  if (typeof value === "boolean") {
    return value;
  }

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) {
    return true;
  }

  if (["0", "false", "no", "n"].includes(normalized)) {
    return false;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed !== 0 : null;
}

function toNullableDate(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeText(value: unknown) {
  return String(value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function normalizeCheckinStatus(value: unknown) {
  const normalized = normalizeText(value);
  if (!normalized) {
    return null;
  }

  if (normalized.includes("da") && normalized.includes("checkin")) {
    return true;
  }

  if (normalized.includes("chua") && normalized.includes("checkin")) {
    return false;
  }

  return null;
}

function generateTicketCode() {
  return `DH${Date.now().toString(36).toUpperCase().slice(0, 2)}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function buildCustomerId(phone: string | null, provided?: string | null) {
  if (provided) {
    return provided;
  }

  const digits = String(phone ?? "").replace(/\D/g, "");
  return digits ? `KH${digits}` : null;
}

function normalizeOrderPayload(body: Record<string, unknown>): NormalizedOrderPayload {
  const money = toNullableNumber(body.money) ?? 0;
  const numberCheckin = toNullableInteger(body.number_checkin);
  const checkinTime = toNullableDate(body.checkin_time ?? body.date_checkin);
  const explicitCheckin = toNullableBoolean(body.is_checkin);
  const statusCheckinInput = body.status_checkin;
  const derivedCheckin =
    explicitCheckin ??
    normalizeCheckinStatus(statusCheckinInput) ??
    (numberCheckin !== null ? numberCheckin > 0 : null) ??
    (checkinTime ? true : null) ??
    false;

  const isCheckin = derivedCheckin ? 1 : 0;
  const normalizedCheckinTime = isCheckin ? (checkinTime ?? new Date()) : null;
  const createTime = toNullableDate(body.create_time ?? body.create_at) ?? new Date();
  const updateTime = toNullableDate(body.update_time) ?? new Date();
  const status = toNullableString(body.status ?? body.trang_thai_thanh_toan) ?? "new";
  const isGift = toNullableInteger(body.is_gift) ?? (status === "present" ? 1 : 0);

  return {
    ordercode: toNullableString(body.ordercode ?? body.orderCode),
    name: toNullableString(body.name),
    phone: toNullableString(body.phone),
    email: toNullableString(body.email),
    gender: toNullableString(body.gender),
    class: toNullableString(body.class),
    money,
    money_VAT: toNullableNumber(body.money_VAT) ?? Number((money * 1.08).toFixed(2)),
    status,
    is_gift: isGift,
    update_time: updateTime,
    create_time: createTime,
    is_checkin: isCheckin,
    number_checkin: numberCheckin ?? (isCheckin ? 1 : 0),
    checkin_time: normalizedCheckinTime,
    career: toNullableString(body.career),
    hope: toNullableString(body.hope),
    ref: toNullableString(body.ref),
    source: toNullableString(body.source),
    send_noti: toNullableInteger(body.send_noti) ?? 0,
    customer_id: buildCustomerId(toNullableString(body.phone), toNullableString(body.customer_id)),
    voucher: toNullableString(body.voucher),
    voucher_status: toNullableString(body.voucher_status),
    status_checkin: isCheckin ? CHECKIN_DONE_STATUS : CHECKIN_PENDING_STATUS,
  };
}

type ExistsRow = RowDataPacket & { is_exists: number };
type CustomerLookupRow = RowDataPacket & {
  id: number;
  customer_ID: string | null;
  name: string | null;
  phone: string | null;
  class: string | null;
  gender: string | null;
  create_by: string | null;
  create_time: Date | null;
  branch: string | null;
};
type CustomerStatsRow = RowDataPacket & {
  total_orders: number | null;
  total_sales: number | null;
  last_payment: Date | null;
};

async function orderCodeExists(orderCode: string, excludeOrderCode?: string | null) {
  const db = getDB();
  const params: unknown[] = [orderCode, TICKET_ORDER_CHANNEL];
  let sql = `
    SELECT 1 AS is_exists
    FROM orders
    WHERE order_ID = ?
      AND kenh_ban = ?
  `;

  if (excludeOrderCode) {
    sql += " AND order_ID <> ? ";
    params.push(excludeOrderCode);
  }

  sql += " LIMIT 1 ";

  const [rows] = await db.query<ExistsRow[]>(sql, params);
  return rows.length > 0;
}

async function ensureUniqueOrderCode(preferred?: string | null, excludeOrderCode?: string | null) {
  if (preferred && preferred === excludeOrderCode) {
    return preferred;
  }

  if (preferred) {
    const preferredTaken = await orderCodeExists(preferred, excludeOrderCode);
    if (!preferredTaken) {
      return preferred;
    }
  }

  for (let index = 0; index < 10; index += 1) {
    const orderCode = generateTicketCode();
    const orderCodeTaken = await orderCodeExists(orderCode, excludeOrderCode);
    if (!orderCodeTaken) {
      return orderCode;
    }
  }

  throw new Error("Unable to generate a unique ticket code");
}

function buildOrderNote(payload: NormalizedOrderPayload) {
  return buildTicketOrderNote({
    email: payload.email,
    gender: payload.gender,
    career: payload.career,
    status_checkin: payload.status_checkin,
    checkin_time: payload.checkin_time?.toISOString() ?? null,
    is_checkin: payload.is_checkin,
    is_gift: payload.is_gift,
    hope: payload.hope,
    ref: payload.ref,
    source: payload.source ?? "dashboard",
    send_noti: payload.send_noti,
    voucher: payload.voucher,
    voucher_status: payload.voucher_status,
  });
}

function buildCustomerNote(payload: NormalizedOrderPayload) {
  const lines = [`Source: ${TICKET_ORDER_BRAND}`];

  if (payload.email) {
    lines.push(`Email: ${payload.email}`);
  }

  if (payload.career) {
    lines.push(`Career: ${payload.career}`);
  }

  if (payload.status_checkin) {
    lines.push(`Check-in: ${payload.status_checkin}`);
  }

  if (payload.voucher) {
    lines.push(`Voucher: ${payload.voucher}`);
  }

  return lines.join("\n");
}

async function findExistingCustomer(customerId: string | null, phone: string | null) {
  if (!customerId && !phone) {
    return null;
  }

  const db = getDB();
  const whereParts: string[] = [];
  const params: unknown[] = [];

  if (customerId) {
    whereParts.push("customer_ID = ?");
    params.push(customerId);
  }

  if (phone) {
    whereParts.push("phone = ?");
    params.push(phone);
  }

  const [rows] = await db.query<CustomerLookupRow[]>(
    `
    SELECT
      id,
      customer_ID,
      name,
      phone,
      class,
      gender,
      create_by,
      create_time,
      branch
    FROM customer
    WHERE ${whereParts.join(" OR ")}
    ORDER BY id DESC
    LIMIT 1
    `,
    params,
  );

  return rows[0] ?? null;
}

async function getCustomerOrderStats(customerId: string | null, phone: string | null) {
  if (!customerId && !phone) {
    return {
      totalOrders: 0,
      totalSales: 0,
      lastPayment: null as Date | null,
    };
  }

  const db = getDB();
  const params: unknown[] = [TICKET_ORDER_CHANNEL];
  const scopeParts: string[] = [];

  if (customerId) {
    scopeParts.push("customer_ID = ?");
    params.push(customerId);
  }

  if (phone) {
    scopeParts.push("phone = ?");
    params.push(phone);
  }

  const [rows] = await db.query<CustomerStatsRow[]>(
    `
    SELECT
      COUNT(DISTINCT order_ID) AS total_orders,
      COALESCE(SUM(thanh_tien), 0) AS total_sales,
      MAX(create_time) AS last_payment
    FROM orders
    WHERE kenh_ban = ?
      AND (${scopeParts.join(" OR ")})
    `,
    params,
  );

  const row = rows[0];

  return {
    totalOrders: Number(row.total_orders ?? 0),
    totalSales: Number(row.total_sales ?? 0),
    lastPayment: row.last_payment ? new Date(row.last_payment) : null,
  };
}

async function syncCustomerFromTicket(payload: NormalizedOrderPayload) {
  const customerId = payload.customer_id;
  const phone = payload.phone;

  if (!customerId && !phone) {
    return;
  }

  const db = getDB();
  const existingCustomer = await findExistingCustomer(customerId, phone);
  const customerStats = await getCustomerOrderStats(customerId, phone);
  const name = payload.name ?? existingCustomer?.name ?? null;
  const ticketClass = payload.class ?? existingCustomer?.class ?? null;
  const gender = payload.gender ?? existingCustomer?.gender ?? null;
  const createBy = existingCustomer?.create_by ?? "admin_ticket";
  const createTime = existingCustomer?.create_time ?? payload.create_time;
  const branch = existingCustomer?.branch ?? TICKET_ORDER_BRAND;
  const lastPayment = customerStats.lastPayment ?? payload.update_time;
  const note = buildCustomerNote(payload);
  const totalSales = customerStats.totalSales;

  if (existingCustomer) {
    await db.query(
      `
      UPDATE customer
      SET
        customer_ID = ?,
        name = ?,
        phone = ?,
        class = ?,
        gender = ?,
        create_by = ?,
        last_payment = ?,
        note = ?,
        branch = ?,
        no_hien_tai = ?,
        tong_ban = ?,
        tong_ban_tru_tra_hang = ?,
        create_time = ?,
        updated_at = ?
      WHERE id = ?
      LIMIT 1
      `,
      [
        customerId,
        name,
        phone,
        ticketClass,
        gender,
        createBy,
        lastPayment,
        note,
        branch,
        0,
        totalSales,
        totalSales,
        createTime,
        payload.update_time,
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
        gender,
        create_by,
        last_payment,
        note,
        branch,
        no_hien_tai,
        tong_ban,
        tong_ban_tru_tra_hang,
        create_time,
        created_at,
        updated_at
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      customerId,
      name,
      phone,
      ticketClass,
      gender,
      "admin_ticket",
      lastPayment,
      note,
      TICKET_ORDER_BRAND,
      0,
      totalSales,
      totalSales,
      payload.create_time,
      payload.create_time,
      payload.update_time,
    ],
  );
}

async function insertTicketOrder(orderCode: string, payload: NormalizedOrderPayload) {
  const db = getDB();

  await db.query(
    `
    INSERT INTO orders
      (
        order_ID,
        brand,
        create_time,
        name_customer,
        customer_ID,
        phone,
        address,
        seller,
        kenh_ban,
        note,
        tien_hang,
        giam_gia,
        thanh_tien,
        status,
        pro_ID,
        name_pro,
        brand_pro,
        quantity,
        created_at,
        updated_at
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      orderCode,
      TICKET_ORDER_BRAND,
      payload.create_time,
      payload.name,
      payload.customer_id,
      payload.phone,
      null,
      null,
      TICKET_ORDER_CHANNEL,
      buildOrderNote(payload),
      Math.round(payload.money),
      0,
      Math.round(payload.money_VAT),
      payload.status,
      TICKET_PRODUCT_ID,
      TICKET_PRODUCT_NAME,
      payload.class,
      1,
      payload.create_time,
      payload.update_time,
    ],
  );
}

async function updateTicketOrder(originalOrderCode: string, payload: NormalizedOrderPayload) {
  const db = getDB();
  const nextOrderCode = await ensureUniqueOrderCode(payload.ordercode ?? originalOrderCode, originalOrderCode);

  await db.query(
    `
    UPDATE orders
    SET
      order_ID = ?,
      brand = ?,
      create_time = ?,
      name_customer = ?,
      customer_ID = ?,
      phone = ?,
      address = ?,
      seller = ?,
      kenh_ban = ?,
      note = ?,
      tien_hang = ?,
      giam_gia = ?,
      thanh_tien = ?,
      status = ?,
      pro_ID = ?,
      name_pro = ?,
      brand_pro = ?,
      quantity = ?,
      updated_at = ?
    WHERE order_ID = ?
      AND kenh_ban = ?
    LIMIT 1
    `,
    [
      nextOrderCode,
      TICKET_ORDER_BRAND,
      payload.create_time,
      payload.name,
      payload.customer_id,
      payload.phone,
      null,
      null,
      TICKET_ORDER_CHANNEL,
      buildOrderNote(payload),
      Math.round(payload.money),
      0,
      Math.round(payload.money_VAT),
      payload.status,
      TICKET_PRODUCT_ID,
      TICKET_PRODUCT_NAME,
      payload.class,
      1,
      payload.update_time,
      originalOrderCode,
      TICKET_ORDER_CHANNEL,
    ],
  );

  return nextOrderCode;
}

async function deleteTicketOrders(orderCodes: string[]) {
  const db = getDB();
  const placeholders = orderCodes.map(() => "?").join(", ");
  const [result] = await db.query<ResultSetHeader>(
    `
    DELETE FROM orders
    WHERE kenh_ban = ?
      AND order_ID IN (${placeholders})
    `,
    [TICKET_ORDER_CHANNEL, ...orderCodes],
  );

  return result.affectedRows;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const payload = normalizeOrderPayload(body);
    const quantityRaw = Number(body.quantity ?? 1);
    const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.floor(quantityRaw) : 1;
    const orderCodes: string[] = [];

    for (let index = 0; index < quantity; index += 1) {
      const orderCode = await ensureUniqueOrderCode(payload.ordercode);
      orderCodes.push(orderCode);
      await insertTicketOrder(orderCode, payload);
    }

    await syncCustomerFromTicket(payload);

    return NextResponse.json({ ok: true, orderCodes });
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const originalOrderCode = toNullableString(body.originalOrderCode ?? body.original_ordercode);

    if (!originalOrderCode) {
      return NextResponse.json({ error: "Missing original order code" }, { status: 400 });
    }

    const payload = normalizeOrderPayload(body);
    const ordercode = await updateTicketOrder(originalOrderCode, payload);
    await syncCustomerFromTicket(payload);

    return NextResponse.json({ ok: true, ordercode });
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = (await req.json()) as { orderCodes?: unknown[] };
    const orderCodesRaw = Array.isArray(body.orderCodes) ? body.orderCodes : [];
    const orderCodes = orderCodesRaw
      .map((value) => toNullableString(value))
      .filter((value): value is string => Boolean(value));

    if (!orderCodes.length) {
      return NextResponse.json({ error: "No order records selected for deletion" }, { status: 400 });
    }

    const deleted = await deleteTicketOrders(orderCodes);
    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: 500 });
  }
}
