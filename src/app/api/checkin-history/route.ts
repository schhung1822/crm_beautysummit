import { NextRequest, NextResponse } from "next/server";
import type { RowDataPacket } from "mysql2/promise";

import { getCurrentUser } from "@/lib/auth";
import { getDB } from "@/lib/db";

type CheckinHistoryRow = RowDataPacket & {
  id: number;
  ordercode: string | null;
  zone_id: string | null;
  zone_name: string | null;
  source: string | null;
  checkin_time: Date | string | null;
  created_by: string | null;
  name: string | null;
  phone: string | null;
  email: string | null;
  ticket_class: string | null;
  status: string | null;
};

type CountRow = RowDataPacket & { total: number };

function toPositiveInt(value: string | null, fallback: number, max: number) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed < 1) return fallback;
  return Math.min(Math.floor(parsed), max);
}

function toIso(value: Date | string | null) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? String(value) : date.toISOString();
}

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = request.nextUrl;
  const page = toPositiveInt(searchParams.get("page"), 1, 100000);
  const pageSize = toPositiveInt(searchParams.get("pageSize"), 10, 10000);
  const search = String(searchParams.get("q") ?? "").trim();
  const offset = (page - 1) * pageSize;

  const whereParts: string[] = [];
  const whereParams: unknown[] = [];

  if (search) {
    const keyword = `%${search}%`;
    whereParts.push(`
      (
        l.ordercode LIKE ?
        OR l.zone_id LIKE ?
        OR l.zone_name LIKE ?
        OR l.source LIKE ?
        OR l.created_by LIKE ?
        OR o.name LIKE ?
        OR o.phone LIKE ?
        OR o.email LIKE ?
        OR o.class LIKE ?
      )
    `);
    whereParams.push(keyword, keyword, keyword, keyword, keyword, keyword, keyword, keyword, keyword);
  }

  const whereSql = whereParts.length ? `WHERE ${whereParts.join(" AND ")}` : "";
  const db = getDB();

  const [countRows] = await db.query<CountRow[]>(
    `
    SELECT COUNT(*) AS total
    FROM checkin_log l
    LEFT JOIN orders o ON o.id = l.order_id
    ${whereSql}
    `,
    whereParams,
  );

  const [rows] = await db.query<CheckinHistoryRow[]>(
    `
    SELECT
      l.id,
      l.ordercode,
      l.zone_id,
      l.zone_name,
      l.source,
      l.checkin_time,
      l.created_by,
      o.name,
      o.phone,
      o.email,
      o.class AS ticket_class,
      o.status
    FROM checkin_log l
    LEFT JOIN orders o ON o.id = l.order_id
    ${whereSql}
    ORDER BY l.checkin_time DESC, l.id DESC
    LIMIT ? OFFSET ?
    `,
    [...whereParams, pageSize, offset],
  );

  return NextResponse.json({
    data: rows.map((row) => ({
      id: row.id,
      ordercode: row.ordercode ?? "",
      zoneId: row.zone_id ?? "",
      zoneName: row.zone_name ?? "",
      source: row.source ?? "",
      checkinTime: toIso(row.checkin_time),
      createdBy: row.created_by ?? "",
      name: row.name ?? "",
      phone: row.phone ?? "",
      email: row.email ?? "",
      ticketClass: row.ticket_class ?? "",
      status: row.status ?? "",
    })),
    pagination: {
      page,
      pageSize,
      total: Number(countRows[0]?.total ?? 0),
    },
  });
}
