/* eslint-disable complexity, max-lines */
import { NextResponse } from "next/server";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { getDB } from "@/lib/db";

type NormalizedOrderPayload = {
  ordercode: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  gender: string | null;
  class: string | null;
  money: number | null;
  money_VAT: number | null;
  status: string | null;
  is_gift: number;
  update_time: Date | null;
  create_time: Date | null;
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
  if (value === null || value === undefined || value === "") return null;
  const numberValue = typeof value === "number" ? value : Number(String(value).replaceAll(",", ""));
  return Number.isFinite(numberValue) ? numberValue : null;
}

function toNullableInteger(value: unknown) {
  const numberValue = toNullableNumber(value);
  if (numberValue === null) return null;
  return Math.max(0, Math.trunc(numberValue));
}

function toNullableBoolean(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  if (typeof value === "boolean") return value;

  const normalized = String(value).trim().toLowerCase();
  if (["1", "true", "yes", "y"].includes(normalized)) return true;
  if (["0", "false", "no", "n"].includes(normalized)) return false;

  const numberValue = Number(normalized);
  if (Number.isFinite(numberValue)) return numberValue !== 0;

  return null;
}

function toNullableDate(value: unknown) {
  const normalized = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  if (!normalized) return null;

  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? null : date;
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
  if (!normalized) return null;
  if (normalized.includes("da") && normalized.includes("checkin")) return true;
  if (normalized.includes("chua") && normalized.includes("checkin")) return false;
  return null;
}

function generateTicketCode() {
  return `DH${Date.now().toString(36).toUpperCase().slice(0, 2)}${Math.random().toString(36).slice(2, 7).toUpperCase()}`;
}

function isMissingTableError(error: unknown) {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    (error as { code?: string }).code === "ER_NO_SUCH_TABLE"
  );
}

function buildCustomerId(phone: string | null, provided?: string | null) {
  if (provided) return provided;

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

  return {
    ordercode: toNullableString(body.ordercode ?? body.orderCode),
    name: toNullableString(body.name),
    phone: toNullableString(body.phone),
    email: toNullableString(body.email),
    gender: toNullableString(body.gender),
    class: toNullableString(body.class),
    money,
    money_VAT: toNullableNumber(body.money_VAT) ?? Number((money * 1.08).toFixed(2)),
    status: toNullableString(body.status ?? body.trang_thai_thanh_toan) ?? "new",
    is_gift: toNullableInteger(body.is_gift) ?? 0,
    update_time: toNullableDate(body.update_time),
    create_time: toNullableDate(body.create_time ?? body.create_at) ?? new Date(),
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
    status_checkin: isCheckin ? "đã checkin" : "chưa checkin",
  };
}

type ExistsRow = RowDataPacket & { is_exists: number };

async function orderCodeExistsInOrders(code: string) {
  const db = getDB();
  const [rows] = await db.query<ExistsRow[]>("SELECT 1 AS is_exists FROM orders WHERE ordercode = ? LIMIT 1", [code]);
  return rows.length > 0;
}

async function orderCodeExistsInLegacy(code: string) {
  const db = getDB();
  const [rows] = await db.query<ExistsRow[]>("SELECT 1 AS is_exists FROM checkin_orders WHERE orderCode = ? LIMIT 1", [
    code,
  ]);
  return rows.length > 0;
}

async function ensureUniqueOrderCode(preferred?: string | null) {
  const isTaken = async (code: string) => {
    try {
      return await orderCodeExistsInOrders(code);
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
      return orderCodeExistsInLegacy(code);
    }
  };

  if (preferred) {
    const preferredTaken = await isTaken(preferred);
    if (!preferredTaken) return preferred;
  }

  for (let index = 0; index < 10; index += 1) {
    const code = generateTicketCode();
    const codeTaken = await isTaken(code);
    if (!codeTaken) return code;
  }

  throw new Error("Không thể tạo mã đơn hàng");
}

async function insertOrderIntoOrders(ordercode: string, payload: NormalizedOrderPayload) {
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
        voucher_status
      )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `,
    [
      ordercode,
      payload.create_time,
      payload.name,
      payload.phone,
      payload.email,
      payload.gender,
      payload.class,
      payload.money,
      payload.money_VAT,
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
    ],
  );
}

async function insertOrderIntoLegacy(ordercode: string, payload: NormalizedOrderPayload) {
  const db = getDB();

  try {
    await db.query(
      `
      INSERT INTO checkin_orders
        (
          orderCode,
          name,
          phone,
          email,
          class,
          money,
          money_VAT,
          trang_thai_thanh_toan,
          update_time,
          create_at,
          gender,
          career,
          status_checkin,
          date_checkin,
          number_checkin
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        ordercode,
        payload.name,
        payload.phone,
        payload.email,
        payload.class,
        payload.money,
        payload.money_VAT,
        payload.status,
        payload.update_time,
        payload.create_time,
        payload.gender,
        payload.career,
        payload.status_checkin,
        payload.checkin_time,
        payload.number_checkin,
      ],
    );
  } catch (error) {
    const message = String(error);
    if (!(message.includes("number_checkin") || message.includes("Unknown column"))) {
      throw error;
    }

    await db.query(
      `
      INSERT INTO checkin_orders
        (
          orderCode,
          name,
          phone,
          email,
          class,
          money,
          money_VAT,
          trang_thai_thanh_toan,
          update_time,
          create_at,
          gender,
          career,
          status_checkin,
          date_checkin
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      [
        ordercode,
        payload.name,
        payload.phone,
        payload.email,
        payload.class,
        payload.money,
        payload.money_VAT,
        payload.status,
        payload.update_time,
        payload.create_time,
        payload.gender,
        payload.career,
        payload.status_checkin,
        payload.checkin_time,
      ],
    );
  }
}

async function updateOrderInOrders(originalOrderCode: string, payload: NormalizedOrderPayload) {
  const db = getDB();
  const nextOrderCode = payload.ordercode ?? originalOrderCode;

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
      voucher_status = ?
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
      payload.money,
      payload.money_VAT,
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
      originalOrderCode,
    ],
  );

  return nextOrderCode;
}

async function updateOrderInLegacy(originalOrderCode: string, payload: NormalizedOrderPayload) {
  const db = getDB();
  const nextOrderCode = payload.ordercode ?? originalOrderCode;

  await db.query(
    `
    UPDATE checkin_orders
    SET
      orderCode = ?,
      name = ?,
      phone = ?,
      email = ?,
      class = ?,
      money = ?,
      money_VAT = ?,
      trang_thai_thanh_toan = ?,
      update_time = ?,
      create_at = ?,
      gender = ?,
      career = ?,
      status_checkin = ?,
      date_checkin = ?
    WHERE orderCode = ?
    LIMIT 1
    `,
    [
      nextOrderCode,
      payload.name,
      payload.phone,
      payload.email,
      payload.class,
      payload.money,
      payload.money_VAT,
      payload.status,
      payload.update_time,
      payload.create_time,
      payload.gender,
      payload.career,
      payload.status_checkin,
      payload.checkin_time,
      originalOrderCode,
    ],
  );

  return nextOrderCode;
}

async function deleteOrdersFromOrders(orderCodes: string[]) {
  const db = getDB();
  const placeholders = orderCodes.map(() => "?").join(", ");
  const [result] = await db.query<ResultSetHeader>(
    `DELETE FROM orders WHERE ordercode IN (${placeholders})`,
    orderCodes,
  );
  return result.affectedRows;
}

async function deleteOrdersFromLegacy(orderCodes: string[]) {
  const db = getDB();
  const placeholders = orderCodes.map(() => "?").join(", ");
  const [result] = await db.query<ResultSetHeader>(
    `DELETE FROM checkin_orders WHERE orderCode IN (${placeholders})`,
    orderCodes,
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
      const ordercode = await ensureUniqueOrderCode(payload.ordercode);
      orderCodes.push(ordercode);

      try {
        await insertOrderIntoOrders(ordercode, payload);
      } catch (error) {
        if (!isMissingTableError(error)) throw error;
        await insertOrderIntoLegacy(ordercode, payload);
      }
    }

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
      return NextResponse.json({ error: "Thiếu mã đơn hàng gốc" }, { status: 400 });
    }

    const payload = normalizeOrderPayload(body);

    let ordercode: string;
    try {
      ordercode = await updateOrderInOrders(originalOrderCode, payload);
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
      ordercode = await updateOrderInLegacy(originalOrderCode, payload);
    }

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
      return NextResponse.json({ error: "Không có bản ghi để xóa" }, { status: 400 });
    }

    let deleted: number;
    try {
      deleted = await deleteOrdersFromOrders(orderCodes);
    } catch (error) {
      if (!isMissingTableError(error)) throw error;
      deleted = await deleteOrdersFromLegacy(orderCodes);
    }

    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    return NextResponse.json({ error: toErrorMessage(error) }, { status: 500 });
  }
}
