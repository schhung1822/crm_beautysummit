import { unstable_cache } from "next/cache";

import type { RowDataPacket } from "mysql2/promise";

import {
  buildRevenueHorizontalBars,
  buildRevenuePie,
  type RevenueGroupRow,
} from "@/app/(main)/dashboard/crm/_components/crm.config";
import { getDB } from "@/lib/db";
import { CHECKIN_DONE_STATUS, CHECKIN_PENDING_STATUS } from "@/lib/ticket-orders";

type ChartResult = ReturnType<typeof buildRevenuePie>;
type RevenueRow = RowDataPacket & Record<string, unknown>;

const moneyExpr = "COALESCE(CAST(NULLIF(REPLACE(money, ',', ''), '') AS UNSIGNED), 0)";
const moneyVatExpr = "COALESCE(CAST(NULLIF(REPLACE(money_VAT, ',', ''), '') AS UNSIGNED), 0)";
const ticketClassExpr = "COALESCE(NULLIF(class, ''), 'Khong ro')";
const careerExpr = "COALESCE(NULLIF(career, ''), 'Khong ro')";
const genderExpr = "COALESCE(NULLIF(gender, ''), 'Khác')";
const checkinStatusExpr = `CASE
  WHEN COALESCE(is_checkin, 0) = 1 OR COALESCE(number_checkin, 0) > 0 OR checkin_time IS NOT NULL THEN '${CHECKIN_DONE_STATUS}'
  ELSE '${CHECKIN_PENDING_STATUS}'
END`;

function mapRows(rows: Array<Record<string, unknown>>): RevenueGroupRow[] {
  return (rows ?? []).map((row) => ({
    name: String(row.name ?? "Khong ro"),
    revenue: Number(row.revenue) || 0,
  }));
}

function buildDateFilter(from?: Date, to?: Date) {
  const clauses = ["ordercode IS NOT NULL", "TRIM(ordercode) <> ''"];
  const params: Array<Date | number | string> = [];

  if (from) {
    clauses.push("create_time >= ?");
    params.push(from);
  }

  if (to) {
    clauses.push("create_time <= ?");
    params.push(to);
  }

  return { clause: clauses.join(" AND "), params };
}

export const getRevenueByChannelChart = unstable_cache(
  async (from?: Date, to?: Date): Promise<ChartResult> => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const [rows] = await db.query<RevenueRow[]>(
      `
        SELECT
          ${ticketClassExpr} AS name,
          SUM(${moneyVatExpr}) AS revenue
        FROM orders
        WHERE ${dateFilter.clause}
        GROUP BY ${ticketClassExpr}
        ORDER BY revenue DESC
      `,
      dateFilter.params,
    );

    return buildRevenuePie(mapRows(rows), "Revenue");
  },
  ["crm-revenue-by-channel"],
  { revalidate: 300 },
);

export const getRevenueByBranchBarChart = unstable_cache(
  async (from?: Date, to?: Date, limit: number = 12) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const [rows] = await db.query<RevenueRow[]>(
      `
        SELECT
          ${careerExpr} AS name,
          SUM(${moneyVatExpr}) AS revenue
        FROM orders
        WHERE ${dateFilter.clause}
        GROUP BY ${careerExpr}
        ORDER BY revenue DESC
        LIMIT ?
      `,
      [...dateFilter.params, limit],
    );

    return buildRevenueHorizontalBars(mapRows(rows));
  },
  ["crm-revenue-branch-bars"],
  { revalidate: 300 },
);

export const getCRMStats = unstable_cache(
  async (from?: Date, to?: Date) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const [rows] = await db.query<RevenueRow[]>(
      `
        SELECT
          COUNT(DISTINCT ordercode) AS totalOrders,
          COUNT(*) AS totalQuantity,
          SUM(${moneyExpr}) AS totalTienHang,
          SUM(${moneyVatExpr}) AS totalThanhTien
        FROM orders
        WHERE ${dateFilter.clause}
      `,
      dateFilter.params,
    );

    const row = rows[0] ?? {};
    return {
      totalOrders: Number(row.totalOrders ?? 0),
      totalQuantity: Number(row.totalQuantity ?? 0),
      totalTienHang: Number(row.totalTienHang ?? 0),
      totalThanhTien: Number(row.totalThanhTien ?? 0),
    };
  },
  ["crm-stats"],
  { revalidate: 300 },
);

export const getBrandConversionFunnel = unstable_cache(
  async (from?: Date, to?: Date) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const [rows] = await db.query<RevenueRow[]>(
      `
        SELECT
          ${checkinStatusExpr} AS brand,
          COUNT(DISTINCT ordercode) AS orders
        FROM orders
        WHERE ${dateFilter.clause}
        GROUP BY ${checkinStatusExpr}
        ORDER BY orders DESC
        LIMIT 5
      `,
      dateFilter.params,
    );

    const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];

    return (rows ?? []).map((row, index) => ({
      stage: String(row.brand ?? CHECKIN_PENDING_STATUS),
      value: Number(row.orders) || 0,
      fill: colors[index % 5],
    }));
  },
  ["crm-brand-funnel"],
  { revalidate: 300 },
);

export const getChannelSalesSummary = unstable_cache(
  async (from?: Date, to?: Date) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const [rows] = await db.query<RevenueRow[]>(
      `
        SELECT
          ${ticketClassExpr} AS kenh_ban,
          COUNT(DISTINCT ordercode) AS orders,
          COUNT(*) AS quantity,
          SUM(${moneyExpr}) AS tien_hang,
          0 AS giam_gia,
          SUM(${moneyVatExpr}) AS thanh_tien,
          SUM(
            CASE
              WHEN LOWER(COALESCE(status, '')) = 'paydone' THEN 1
              ELSE 0
            END
          ) AS paydone_count,
          SUM(
            CASE
              WHEN LOWER(COALESCE(status, '')) = 'paydone' THEN ${moneyExpr}
              ELSE 0
            END
          ) AS paydone_money,
          SUM(
            CASE
              WHEN LOWER(COALESCE(status, '')) = 'paydone' THEN ${moneyVatExpr}
              ELSE 0
            END
          ) AS paydone_money_vat
        FROM orders
        WHERE ${dateFilter.clause}
        GROUP BY ${ticketClassExpr}
        ORDER BY thanh_tien DESC
      `,
      dateFilter.params,
    );

    return (rows ?? []).map((row) => ({
      kenh_ban: String(row.kenh_ban ?? "Khong ro"),
      order_count: Number(row.orders) || 0,
      quantity: Number(row.quantity) || 0,
      tien_hang: Number(row.tien_hang) || 0,
      giam_gia: Number(row.giam_gia) || 0,
      thanh_tien: Number(row.thanh_tien) || 0,
      paydone_count: Number(row.paydone_count) || 0,
      paydone_money: Number(row.paydone_money) || 0,
      paydone_money_vat: Number(row.paydone_money_vat) || 0,
    }));
  },
  ["crm-channel-sales-summary"],
  { revalidate: 300 },
);

export const getTopProductsByQuantity = unstable_cache(
  async (from?: Date, to?: Date, limit: number = 10) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const [rows] = await db.query<RevenueRow[]>(
      `
        SELECT
          ${ticketClassExpr} AS product,
          COUNT(*) AS totalQuantity
        FROM orders
        WHERE ${dateFilter.clause}
        GROUP BY ${ticketClassExpr}
        ORDER BY totalQuantity DESC
        LIMIT ?
      `,
      [...dateFilter.params, limit],
    );

    const total = (rows ?? []).reduce((sum, row) => sum + (Number(row.totalQuantity) || 0), 0);

    return (rows ?? []).map((row) => {
      const quantity = Number(row.totalQuantity) || 0;
      return {
        product: String(row.product ?? "Khong ro"),
        quantity,
        percentage: total > 0 ? Math.round((quantity / total) * 100) : 0,
      };
    });
  },
  ["crm-top-products-quantity"],
  { revalidate: 300 },
);

export const getTopSalesByRevenue = unstable_cache(
  async (from?: Date, to?: Date, limit: number = 5) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const [rows] = await db.query<RevenueRow[]>(
      `
        SELECT
          ${genderExpr} AS seller,
          SUM(${moneyVatExpr}) AS totalRevenue,
          COUNT(DISTINCT ordercode) AS totalOrders
        FROM orders
        WHERE ${dateFilter.clause}
        GROUP BY ${genderExpr}
        ORDER BY totalRevenue DESC
        LIMIT ?
      `,
      [...dateFilter.params, limit],
    );

    return (rows ?? []).map((row) => ({
      seller: String(row.seller ?? "Khác"),
      revenue: Number(row.totalRevenue) || 0,
      orders: Number(row.totalOrders) || 0,
    }));
  },
  ["crm-top-sales-revenue"],
  { revalidate: 300 },
);
