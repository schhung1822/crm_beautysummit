/* eslint-disable complexity, max-lines */
import { NextResponse } from "next/server";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { getCurrentUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { normalizePhoneDigits, toDatabasePhone } from "@/lib/phone";
import { buildCheckinStatusLabel, normalizeCheckinFlag } from "@/lib/ticket-orders";

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
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
};

type ExistsRow = RowDataPacket & { is_exists: number };
type ExistingOrderRow = RowDataPacket & {
  ordercode: string | null;
  order_id: string | null;
  status: string | null;
  money: number | null;
  money_VAT: number | null;
};
type OrderTotalRow = RowDataPacket & { total_payment: number | string | null };
type CustomerLookupRow = RowDataPacket & {
  id: number;
  customer_id: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  career: string | null;
  create_time: Date | null;
};

const ADMIN_ORDER_ID_PREFIX = "AD";
const ADMIN_ORDER_ID_DIGITS = 7;
const UPDATE_PAYMENT_WEBHOOK_URL = "https://nextg.nextgency.vn/webhook/update-payment";
const WEBHOOK_TIME_ZONE = "Asia/Bangkok";

function toNullableString(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  return normalized.length > 0 ? normalized : null;
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

function toNullableDate(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  if (!normalized) {
    return null;
  }

  const parsed = new Date(normalized);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function generateTicketCode() {
  return `DH${Date.now().toString(36).toUpperCase().slice(0, 2)}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function generateAdminOrderId() {
  const randomDigits = Math.floor(Math.random() * 10 ** ADMIN_ORDER_ID_DIGITS)
    .toString()
    .padStart(ADMIN_ORDER_ID_DIGITS, "0");

  return `${ADMIN_ORDER_ID_PREFIX}${randomDigits}`;
}

function buildCustomerId(phone: string | null, provided?: string | null) {
  if (provided) {
    return provided;
  }

  const digits = normalizePhoneDigits(phone);
  return digits ? `KH${digits}` : null;
}

function getTicketCreatorAccountName(user: Awaited<ReturnType<typeof getCurrentUser>>) {
  const username = toNullableString(user?.username);
  const name = toNullableString(user?.name);
  const email = toNullableString(user?.email);

  return username ?? name ?? email;
}

function buildAdminUtmSource(currentValue: string | null, creatorAccountName: string | null) {
  if (!creatorAccountName) {
    return currentValue;
  }

  if (!currentValue) {
    return creatorAccountName;
  }

  return currentValue === creatorAccountName ? currentValue : `${currentValue} | ${creatorAccountName}`;
}

function formatWebhookTransactionDate(value: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: WEBHOOK_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(value);

  const lookup = new Map(parts.map((part) => [part.type, part.value]));
  const year = lookup.get("year") ?? "0000";
  const month = lookup.get("month") ?? "00";
  const day = lookup.get("day") ?? "00";
  const hour = lookup.get("hour") ?? "00";
  const minute = lookup.get("minute") ?? "00";

  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function normalizePaymentStatus(value: string | null | undefined) {
  return String(value ?? "").trim().toLowerCase();
}

function isPaydoneStatus(value: string | null | undefined) {
  return normalizePaymentStatus(value) === "paydone";
}

function resolvePaymentAmount(money: number, moneyVat: number) {
  const normalizedMoney = Number.isFinite(money) ? money : 0;
  const normalizedMoneyVat = Number.isFinite(moneyVat) ? moneyVat : 0;
  const preferredAmount = normalizedMoneyVat > 0 ? normalizedMoneyVat : normalizedMoney;
  return Math.max(0, Math.round(preferredAmount));
}

function normalizeOrderPayload(body: Record<string, unknown>): NormalizedOrderPayload {
  const money = toNullableNumber(body.money) ?? 0;
  const numberCheckinInput = toNullableInteger(body.number_checkin);
  const isCheckin = normalizeCheckinFlag(body.is_checkin ?? body.status_checkin);
  const checkinTime = isCheckin === 1 ? (toNullableDate(body.checkin_time ?? body.date_checkin) ?? new Date()) : null;
  const numberCheckin = numberCheckinInput ?? (isCheckin === 1 ? 1 : 0);
  const createTime = toNullableDate(body.create_time ?? body.create_at) ?? new Date();
  const updateTime = toNullableDate(body.update_time) ?? new Date();
  const status = toNullableString(body.status ?? body.trang_thai_thanh_toan) ?? "new";
  const isGift = toNullableInteger(body.is_gift) ?? (status === "present" ? 1 : 0);

  return {
    ordercode: toNullableString(body.ordercode ?? body.orderCode),
    name: toNullableString(body.name),
    phone: toDatabasePhone(body.phone),
    email: toNullableString(body.email),
    gender: toNullableString(body.gender),
    class: toNullableString(body.class),
    money,
    money_VAT: toNullableNumber(body.money_VAT) ?? money,
    status,
    is_gift: isGift,
    update_time: updateTime,
    create_time: createTime,
    is_checkin: isCheckin,
    number_checkin: numberCheckin,
    checkin_time: checkinTime,
    career: toNullableString(body.career),
    hope: toNullableString(body.hope),
    ref: toNullableString(body.ref),
    source: toNullableString(body.source),
    send_noti: toNullableInteger(body.send_noti) ?? 0,
    customer_id: buildCustomerId(toDatabasePhone(body.phone), toNullableString(body.customer_id)),
    voucher: toNullableString(body.voucher),
    voucher_status: toNullableString(body.voucher_status),
    utm_source: toNullableString(body.utm_source),
    utm_medium: toNullableString(body.utm_medium),
    utm_campaign: toNullableString(body.utm_campaign),
  };
}

async function orderCodeExists(orderCode: string, excludeOrderCode?: string | null) {
  const db = getDB();
  const params: unknown[] = [orderCode];
  let sql = `
    SELECT 1 AS is_exists
    FROM orders
    WHERE ordercode = ?
  `;

  if (excludeOrderCode) {
    sql += " AND ordercode <> ? ";
    params.push(excludeOrderCode);
  }

  sql += " LIMIT 1 ";

  const [rows] = await db.query<ExistsRow[]>(sql, params);
  return rows.length > 0;
}

async function findOrderByCode(orderCode: string) {
  const db = getDB();
  const [rows] = await db.query<ExistingOrderRow[]>(
    `
    SELECT
      ordercode,
      order_id,
      status,
      money,
      money_VAT
    FROM orders
    WHERE ordercode = ?
    LIMIT 1
    `,
    [orderCode],
  );

  return rows[0] ?? null;
}

async function getOrderTransferAmount(orderId: string | null, orderCode: string) {
  const db = getDB();

  if (orderId) {
    const [rows] = await db.query<OrderTotalRow[]>(
      `
      SELECT COALESCE(SUM(COALESCE(money_VAT, money, 0)), 0) AS total_payment
      FROM orders
      WHERE order_id = ?
      `,
      [orderId],
    );

    const total = Number(rows[0]?.total_payment ?? 0);
    return Math.max(0, Math.round(Number.isFinite(total) ? total : 0));
  }

  const existingOrder = await findOrderByCode(orderCode);
  if (!existingOrder) {
    return 0;
  }

  return resolvePaymentAmount(Number(existingOrder.money ?? 0), Number(existingOrder.money_VAT ?? 0));
}

async function orderIdExists(orderId: string) {
  const db = getDB();
  const [rows] = await db.query<ExistsRow[]>(
    `
    SELECT 1 AS is_exists
    FROM orders
    WHERE order_id = ?
    LIMIT 1
    `,
    [orderId],
  );

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

async function ensureUniqueAdminOrderId() {
  for (let index = 0; index < 20; index += 1) {
    const orderId = generateAdminOrderId();
    const orderIdTaken = await orderIdExists(orderId);
    if (!orderIdTaken) {
      return orderId;
    }
  }

  throw new Error("Unable to generate a unique admin order id");
}

async function findExistingCustomer(customerId: string | null, phone: string | null) {
  if (!customerId && !phone) {
    return null;
  }

  const db = getDB();
  const whereParts: string[] = [];
  const params: unknown[] = [];

  if (customerId) {
    whereParts.push("customer_id = ?");
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
      customer_id,
      name,
      phone,
      email,
      gender,
      career,
      create_time
    FROM customer
    WHERE ${whereParts.join(" OR ")}
    ORDER BY id DESC
    LIMIT 1
    `,
    params,
  );

  return rows.length > 0 ? rows[0] : null;
}

async function syncCustomerFromOrder(payload: NormalizedOrderPayload) {
  const customerId = payload.customer_id;
  const phone = payload.phone;

  if (!customerId && !phone) {
    return;
  }

  const db = getDB();
  const existingCustomer = await findExistingCustomer(customerId, phone);

  if (existingCustomer) {
    await db.query(
      `
      UPDATE customer
      SET
        customer_id = ?,
        name = ?,
        gender = ?,
        phone = ?,
        email = ?,
        career = ?,
        updated_at = NOW()
      WHERE id = ?
      LIMIT 1
      `,
      [
        customerId,
        payload.name ?? existingCustomer.name,
        payload.gender ?? existingCustomer.gender,
        phone,
        payload.email ?? existingCustomer.email,
        payload.career ?? existingCustomer.career,
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
    [customerId, payload.name, payload.gender, phone, payload.email, payload.career, payload.create_time],
  );
}

async function insertTicketOrder(orderCode: string, orderId: string, payload: NormalizedOrderPayload) {
  const db = getDB();

  await db.query(
    `
    INSERT INTO orders
      (
        ordercode,
        order_id,
        create_time,
        name,
        phone,
        email,
        gender,
        class,
        money,
        money_VAT,
        status,
        is_gift,
        update_time,
        is_checkin,
        number_checkin,
        checkin_time,
        career,
        hope,
        ref,
        source,
        send_noti,
        customer_id,
        voucher,
        voucher_status,
        utm_source,
        utm_medium,
        utm_campaign,
        created_at,
        updated_at
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      orderCode,
      orderId,
      payload.create_time,
      payload.name,
      payload.phone,
      payload.email,
      payload.gender,
      payload.class,
      Math.round(payload.money),
      Math.round(payload.money_VAT),
      payload.status,
      payload.is_gift,
      payload.update_time,
      payload.is_checkin,
      payload.number_checkin,
      payload.checkin_time,
      payload.career,
      payload.hope,
      payload.ref,
      payload.source,
      payload.send_noti,
      payload.customer_id,
      payload.voucher,
      payload.voucher_status,
      payload.utm_source,
      payload.utm_medium,
      payload.utm_campaign,
      payload.create_time,
      payload.update_time,
    ],
  );
}

async function notifyPaymentUpdateWebhook(payload: { code: string; transactionDate: Date; transferAmount: number }) {
  try {
    const response = await fetch(UPDATE_PAYMENT_WEBHOOK_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        code: payload.code,
        transactionDate: formatWebhookTransactionDate(payload.transactionDate),
        transferAmount: payload.transferAmount,
      }),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const responseBody = await response.text().catch(() => "");
      console.error("Update payment webhook returned non-OK response", {
        status: response.status,
        statusText: response.statusText,
        body: responseBody,
        code: payload.code,
      });
    }
  } catch (error) {
    console.error("Failed to notify update payment webhook", {
      code: payload.code,
      error: toErrorMessage(error),
    });
  }
}

async function updateTicketOrder(originalOrderCode: string, payload: NormalizedOrderPayload) {
  const db = getDB();
  const nextOrderCode = await ensureUniqueOrderCode(payload.ordercode ?? originalOrderCode, originalOrderCode);

  await db.query(
    `
    UPDATE orders
    SET
      ordercode = ?,
      create_time = ?,
      name = ?,
      phone = ?,
      email = ?,
      gender = ?,
      class = ?,
      money = ?,
      money_VAT = ?,
      status = ?,
      is_gift = ?,
      update_time = ?,
      is_checkin = ?,
      number_checkin = ?,
      checkin_time = ?,
      career = ?,
      hope = ?,
      ref = ?,
      source = ?,
      send_noti = ?,
      customer_id = ?,
      voucher = ?,
      voucher_status = ?,
      utm_source = ?,
      utm_medium = ?,
      utm_campaign = ?,
      updated_at = NOW()
    WHERE ordercode = ?
    LIMIT 1
    `,
    [
      nextOrderCode,
      payload.create_time,
      payload.name,
      payload.phone,
      payload.email,
      payload.gender,
      payload.class,
      Math.round(payload.money),
      Math.round(payload.money_VAT),
      payload.status,
      payload.is_gift,
      payload.update_time,
      payload.is_checkin,
      payload.number_checkin,
      payload.checkin_time,
      payload.career,
      payload.hope,
      payload.ref,
      payload.source,
      payload.send_noti,
      payload.customer_id,
      payload.voucher,
      payload.voucher_status,
      payload.utm_source,
      payload.utm_medium,
      payload.utm_campaign,
      originalOrderCode,
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
    WHERE ordercode IN (${placeholders})
    `,
    [...orderCodes],
  );

  return result.affectedRows;
}

function toErrorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Record<string, unknown>;
    const currentUser = await getCurrentUser();
    const payload = normalizeOrderPayload(body);
    const quantityRaw = Number(body.quantity ?? 1);
    const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.floor(quantityRaw) : 1;
    const orderId = await ensureUniqueAdminOrderId();
    const creatorAccountName = getTicketCreatorAccountName(currentUser);
    const preparedPayload: NormalizedOrderPayload = {
      ...payload,
      utm_source: buildAdminUtmSource(payload.utm_source, creatorAccountName),
    };
    const orderCodes: string[] = [];

    for (let index = 0; index < quantity; index += 1) {
      const orderCode = await ensureUniqueOrderCode(payload.ordercode);
      orderCodes.push(orderCode);
      await insertTicketOrder(orderCode, orderId, preparedPayload);
    }

    await syncCustomerFromOrder(preparedPayload);
    await notifyPaymentUpdateWebhook({
      code: orderId,
      transactionDate: preparedPayload.create_time,
      transferAmount: resolvePaymentAmount(preparedPayload.money, preparedPayload.money_VAT) * quantity,
    });

    return NextResponse.json({ ok: true, orderCodes, orderId });
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

    const existingOrder = await findOrderByCode(originalOrderCode);
    if (!existingOrder) {
      return NextResponse.json({ error: "Order record not found" }, { status: 404 });
    }

    const payload = normalizeOrderPayload(body);
    const ordercode = await updateTicketOrder(originalOrderCode, payload);
    await syncCustomerFromOrder(payload);

    if (!isPaydoneStatus(existingOrder.status) && isPaydoneStatus(payload.status)) {
      const webhookCode = toNullableString(existingOrder.order_id) ?? ordercode;
      const transferAmount = await getOrderTransferAmount(toNullableString(existingOrder.order_id), ordercode);

      await notifyPaymentUpdateWebhook({
        code: webhookCode,
        transactionDate: payload.update_time,
        transferAmount,
      });
    }

    return NextResponse.json({
      ok: true,
      ordercode,
      status_checkin: buildCheckinStatusLabel(payload.is_checkin),
    });
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
