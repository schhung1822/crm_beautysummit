/* eslint-disable complexity, max-lines */
import { NextResponse } from "next/server";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

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

function buildCustomerId(phone: string | null, provided?: string | null) {
  if (provided) {
    return provided;
  }

  const digits = normalizePhoneDigits(phone);
  return digits ? `KH${digits}` : null;
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

async function insertTicketOrder(orderCode: string, payload: NormalizedOrderPayload) {
  const db = getDB();

  await db.query(
    `
    INSERT INTO orders
      (
        ordercode,
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
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      orderCode,
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
    const payload = normalizeOrderPayload(body);
    const quantityRaw = Number(body.quantity ?? 1);
    const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.floor(quantityRaw) : 1;
    const orderCodes: string[] = [];

    for (let index = 0; index < quantity; index += 1) {
      const orderCode = await ensureUniqueOrderCode(payload.ordercode);
      orderCodes.push(orderCode);
      await insertTicketOrder(orderCode, payload);
    }

    await syncCustomerFromOrder(payload);

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
    await syncCustomerFromOrder(payload);

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
