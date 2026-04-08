import { NextResponse } from "next/server";

import type { ResultSetHeader } from "mysql2";

import { getDB } from "@/lib/db";
import { toDatabasePhone } from "@/lib/phone";

function toNullableString(value: unknown) {
  const v = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  return v.length ? v : null;
}

function toNullableDate(value: unknown) {
  const v = typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim();
  if (!v) return null;
  const d = new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

type VoteRecordKey = {
  ordercode: string;
  phone: string;
  brand_id: string;
  time_vote: Date | null;
};

function toVoteRecordKey(value: unknown): VoteRecordKey | null {
  if (!value || typeof value !== "object") return null;

  const record = value as Record<string, unknown>;
  const ordercode = toNullableString(record.ordercode);
  const phone = toDatabasePhone(record.phone);
  const brand_id = toNullableString(record.brand_id);
  const time_vote = toNullableDate(record.time_vote);

  if (!ordercode || !phone || !brand_id) return null;
  return { ordercode, phone, brand_id, time_vote };
}

async function deleteVoteRecord(db: ReturnType<typeof getDB>, record: VoteRecordKey) {
  const [result] = await db.query<ResultSetHeader>(
    `
    DELETE FROM voted
    WHERE ordercode = ?
      AND phone = ?
      AND brand_id = ?
      AND (
        (time_vote IS NULL AND ? IS NULL)
        OR time_vote = ?
      )
    LIMIT 1
    `,
    [record.ordercode, record.phone, record.brand_id, record.time_vote, record.time_vote],
  );

  return result.affectedRows;
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();

    const original = {
      ordercode: toNullableString(body.original?.ordercode),
      phone: toDatabasePhone(body.original?.phone),
      brand_id: toNullableString(body.original?.brand_id),
      time_vote: toNullableDate(body.original?.time_vote),
    };

    if (!original.ordercode || !original.phone || !original.brand_id) {
      return NextResponse.json({ error: "Thieu khoa dinh danh ban ghi vote" }, { status: 400 });
    }

    const payload = {
      ordercode: toNullableString(body.ordercode),
      name: toNullableString(body.name),
      phone: toDatabasePhone(body.phone),
      email: toNullableString(body.email),
      gender: toNullableString(body.gender),
      brand_id: toNullableString(body.brand_id),
      time_vote: toNullableDate(body.time_vote),
    };

    const db = getDB();
    await db.query(
      `
      UPDATE voted
      SET
        ordercode = ?,
        name = ?,
        phone = ?,
        email = ?,
        gender = ?,
        brand_id = ?,
        time_vote = ?
      WHERE ordercode = ?
        AND phone = ?
        AND brand_id = ?
        AND (
          (time_vote IS NULL AND ? IS NULL)
          OR time_vote = ?
        )
      LIMIT 1
      `,
      [
        payload.ordercode,
        payload.name,
        payload.phone,
        payload.email,
        payload.gender,
        payload.brand_id,
        payload.time_vote,
        original.ordercode,
        original.phone,
        original.brand_id,
        original.time_vote,
        original.time_vote,
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
    const recordsRaw = Array.isArray(body?.records) ? body.records : [];
    const records = recordsRaw
      .map((record: unknown): VoteRecordKey | null => toVoteRecordKey(record))
      .filter((record: VoteRecordKey | null): record is VoteRecordKey => Boolean(record));

    if (!records.length) {
      return NextResponse.json({ error: "Khong co ban ghi de xoa" }, { status: 400 });
    }

    const db = getDB();
    const deletedList = await Promise.all(records.map((record: VoteRecordKey) => deleteVoteRecord(db, record)));
    const deleted = deletedList.reduce((sum, value) => sum + value, 0);

    return NextResponse.json({ ok: true, deleted });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
