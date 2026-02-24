import { channelSchema, Channel } from "@/app/(main)/dashboard/default/_components/schema";
import { getDB } from "@/lib/db";

type GetChannelsParams = {
  from?: string | Date;
  to?: string | Date;
};

function toDate(v?: string | Date) {
  if (!v) return null;
  const d = v instanceof Date ? v : new Date(v);
  return Number.isNaN(d.getTime()) ? null : d;
}

function normalizeRange(from?: string | Date, to?: string | Date) {
  const f = toDate(from);
  const t = toDate(to);

  const fromDate = f ? new Date(f.getFullYear(), f.getMonth(), f.getDate(), 0, 0, 0, 0) : null;

  const toDateNorm = t ? new Date(t.getFullYear(), t.getMonth(), t.getDate(), 23, 59, 59, 999) : null;

  return { fromDate, toDateNorm };
}

export async function getChannels(params: GetChannelsParams = {}): Promise<Channel[]> {
  const db = getDB();
  const { fromDate, toDateNorm } = normalizeRange(params.from, params.to);

  const where: string[] = [];
  const values: any[] = [];

  if (fromDate) {
    where.push(`\`create_at\` >= ?`);
    values.push(fromDate);
  }
  if (toDateNorm) {
    where.push(`\`create_at\` <= ?`);
    values.push(toDateNorm);
  }

  const sql = `
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
    ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
    ORDER BY create_at DESC
  `;

  const [rows] = await db.query<any[]>(sql, values);

  return (rows ?? []).map((r) =>
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
}
