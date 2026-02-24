// src/lib/ordersByCustomer.ts
import { channelSchema, type Channel } from "@/app/(main)/orders/_components/schema";
import { getDB } from "@/lib/db";

type Paging = { page?: number; pageSize?: number | "all" | -1 };

export async function getOrdersByCustomer(
  customerIdRaw: string,
  paging?: Paging,
): Promise<{ rows: Channel[]; total: number }> {
  const customerId = String(customerIdRaw || "").trim();
  const wantAll = !paging || paging.pageSize === undefined || paging.pageSize === "all" || Number(paging.pageSize) <= 0;

  const page = Number(paging?.page ?? 1) || 1;
  const pageSize = wantAll ? undefined : Number(paging?.pageSize) || 20;
  const offset = pageSize ? (page - 1) * pageSize : undefined;

  const db = getDB();

  // ===== helper build =====
  const limitSql = pageSize ? " LIMIT ? OFFSET ? " : "";
  const limitParams = pageSize ? [pageSize, offset!] : [];

  // Fetch orders by phone (from checkin_orders)
  const selectBase = `
    SELECT
      `orderCode`,
      `name`,
      `phone`,
      `email`,
      `class`,
      `money`,
      `money_VAT`,
      `trang_thai_thanh_toan`,
      `update_time`,
      `create_at`,
      `gender`,
      `career`,
      `status_checkin`,
      `date_checkin`
    FROM `checkin_orders`
    WHERE `phone` = ?
    ORDER BY create_at DESC
    ${limitSql}
  `;

  const [rows] = await db.query<any[]>(selectBase, [customerId, ...limitParams]);

  // Get total count
  let total: number;
  if (wantAll) {
    total = rows?.length ?? 0;
  } else {
    const [cntResult] = await db.query<any[]>(`SELECT COUNT(*) AS total FROM checkin_orders WHERE \`phone\` = ?`, [
      customerId,
    ]);
    total = Number(cntResult?.[0]?.total ?? 0);
  }

  const parsed = (rows ?? []).map((r) =>
    channelSchema.parse({
      orderCode: String(r.orderCode ?? ""),
      name: String(r.name ?? ""),
      phone: String(r.phone ?? ""),
      email: String(r.email ?? ""),
      class: String(r.class ?? ""),
      money: Number(r.money) || 0,
      money_VAT: Number(r.money_VAT) || 0,
      trang_thai_thanh_toan: String(r.trang_thai_thanh_toan ?? ""),
      update_time: r.update_time ? new Date(r.update_time) : null,
      create_at: r.create_at ? new Date(r.create_at) : r.created_at ? new Date(r.created_at) : null,
      gender: String(r.gender ?? ""),
      career: String(r.career ?? ""),
      status_checkin: String(r.status_checkin ?? ""),
      date_checkin: r.date_checkin ? new Date(r.date_checkin) : null,
    }),
  );

  return { rows: parsed, total };
}
