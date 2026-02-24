import { NextResponse } from "next/server";

import type { ResultSetHeader, RowDataPacket } from "mysql2";

import { getDB } from "@/lib/db";

function toNullableString(value: unknown) {
  const v = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  return v.length ? v : null;
}

function toNullableNumber(value: unknown) {
  if (value === null || value === undefined || value === "") return null;
  const n = typeof value === "number" ? value : Number(String(value).replaceAll(",", ""));
  return Number.isFinite(n) ? n : null;
}

function toNullableDate(value: unknown) {
  const v = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function generateTicketCode() {
  return (
    "DH" + Date.now().toString(36).toUpperCase().substring(0, 2) + Math.random().toString(36).substr(2, 5).toUpperCase()
  );
}

type ExistsRow = RowDataPacket & { is_exists: number };

async function ensureUniqueOrderCode(db: ReturnType<typeof getDB>, preferred?: string | null) {
  const tryCode = async (code: string) => {
    const [rows] = await db.query<ExistsRow[]>(
      "SELECT 1 AS is_exists FROM checkin_orders WHERE orderCode = ? LIMIT 1",
      [code],
    );
    return rows.length ? null : code;
  };

  if (preferred) {
    const unique = await tryCode(preferred);
    if (unique) return unique;
  }

  for (let i = 0; i < 10; i += 1) {
    const code = generateTicketCode();
    const unique = await tryCode(code);
    if (unique) return unique;
  }

  throw new Error("Không thể tạo mã đơn hàng");
}

async function insertOrderWithFallback(db: ReturnType<typeof getDB>, values: Array<string | number | Date | null>) {
  try {
    await db.query(
      `
      INSERT INTO checkin_orders
        (
          \`orderCode\`,
          \`name\`,
          \`phone\`,
          \`email\`,
          \`class\`,
          \`money\`,
          \`money_VAT\`,
          \`trang_thai_thanh_toan\`,
          \`update_time\`,
          \`create_at\`,
          \`gender\`,
          \`career\`,
          \`status_checkin\`,
          \`date_checkin\`,
          \`number_checkin\`
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values,
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
          \`orderCode\`,
          \`name\`,
          \`phone\`,
          \`email\`,
          \`class\`,
          \`money\`,
          \`money_VAT\`,
          \`trang_thai_thanh_toan\`,
          \`update_time\`,
          \`create_at\`,
          \`gender\`,
          \`career\`,
          \`status_checkin\`,
          \`date_checkin\`
        )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `,
      values.slice(0, 14),
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const payload = {
      orderCode: toNullableString(body.orderCode),
      name: toNullableString(body.name),
      phone: toNullableString(body.phone),
      email: toNullableString(body.email),
      class: toNullableString(body.class),
      money: toNullableNumber(body.money),
      money_VAT: toNullableNumber(body.money_VAT),
      trang_thai_thanh_toan: toNullableString(body.trang_thai_thanh_toan),
      update_time: toNullableDate(body.update_time),
      create_at: toNullableDate(body.create_at),
      gender: toNullableString(body.gender),
      career: toNullableString(body.career),
      status_checkin: toNullableString(body.status_checkin) ?? "chưa checkin",
      date_checkin: toNullableDate(body.date_checkin),
      number_checkin: Number.isFinite(Number(body.number_checkin)) ? Number(body.number_checkin) : 0,
    };

    const quantityRaw = Number(body.quantity ?? 1);
    const quantity = Number.isFinite(quantityRaw) && quantityRaw > 0 ? Math.floor(quantityRaw) : 1;

    const db = getDB();
    const orderCodes: string[] = [];

    for (let i = 0; i < quantity; i += 1) {
      const orderCode = await ensureUniqueOrderCode(db, payload.orderCode);
      orderCodes.push(orderCode);
      const values = [
        orderCode,
        payload.name,
        payload.phone,
        payload.email,
        payload.class,
        payload.money,
        payload.money_VAT,
        payload.trang_thai_thanh_toan,
        payload.update_time,
        payload.create_at,
        payload.gender,
        payload.career,
        payload.status_checkin,
        payload.date_checkin,
        payload.number_checkin,
      ];

      await insertOrderWithFallback(db, values);
    }

    return NextResponse.json({ ok: true, orderCodes });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const originalOrderCode = toNullableString(body.originalOrderCode);

    if (!originalOrderCode) {
      return NextResponse.json({ error: "Thiếu mã đơn hàng gốc" }, { status: 400 });
    }

    const payload = {
      orderCode: toNullableString(body.orderCode),
      name: toNullableString(body.name),
      phone: toNullableString(body.phone),
      email: toNullableString(body.email),
      class: toNullableString(body.class),
      money: toNullableNumber(body.money),
      money_VAT: toNullableNumber(body.money_VAT),
      trang_thai_thanh_toan: toNullableString(body.trang_thai_thanh_toan),
      update_time: toNullableDate(body.update_time),
      create_at: toNullableDate(body.create_at),
      gender: toNullableString(body.gender),
      career: toNullableString(body.career),
      status_checkin: toNullableString(body.status_checkin),
      date_checkin: toNullableDate(body.date_checkin),
    };

    const db = getDB();
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
        payload.orderCode,
        payload.name,
        payload.phone,
        payload.email,
        payload.class,
        payload.money,
        payload.money_VAT,
        payload.trang_thai_thanh_toan,
        payload.update_time,
        payload.create_at,
        payload.gender,
        payload.career,
        payload.status_checkin,
        payload.date_checkin,
        originalOrderCode,
      ],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const body = await req.json();
    const orderCodesRaw = Array.isArray(body?.orderCodes) ? body.orderCodes : [];
    const orderCodes = orderCodesRaw
      .map((value: unknown) => toNullableString(value))
      .filter((value: string | null): value is string => Boolean(value));

    if (!orderCodes.length) {
      return NextResponse.json({ error: "Không có bản ghi để xóa" }, { status: 400 });
    }

    const placeholders = orderCodes.map(() => "?").join(", ");
    const db = getDB();
    const [result] = await db.query<ResultSetHeader>(
      `DELETE FROM checkin_orders WHERE orderCode IN (${placeholders})`,
      orderCodes,
    );

    return NextResponse.json({ ok: true, deleted: result.affectedRows });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
