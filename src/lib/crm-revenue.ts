import { unstable_cache } from "next/cache";

import {
  buildRevenueHorizontalBars,
  buildRevenuePie,
  type RevenueGroupRow,
} from "@/app/(main)/dashboard/crm/_components/crm.config";
import { getDB } from "@/lib/db";
import { CHECKIN_PENDING_STATUS, TICKET_ORDER_CHANNEL } from "@/lib/ticket-orders";

type ChartResult = ReturnType<typeof buildRevenuePie>;

const careerExpr = "COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(note, '$.career')), ''), 'Khong ro')";
const genderExpr = "COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(note, '$.gender')), ''), 'Khong ro')";
const checkinStatusExpr = `COALESCE(NULLIF(JSON_UNQUOTE(JSON_EXTRACT(note, '$.status_checkin')), ''), '${CHECKIN_PENDING_STATUS}')`;
const ticketClassExpr = "COALESCE(NULLIF(brand_pro, ''), 'Khong ro')";

function mapRows(rows: any[]): RevenueGroupRow[] {
  return (rows ?? []).map((row) => ({
    name: String(row.name ?? "Khong ro"),
    revenue: Number(row.revenue) || 0,
  }));
}

function buildDateFilter(from?: Date, to?: Date) {
  const clauses = ["kenh_ban = ?"];
  const params: (Date | number | string)[] = [TICKET_ORDER_CHANNEL];

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

    const [rows] = await db.query<any[]>(
      `
      SELECT
        ${ticketClassExpr} AS name,
        SUM(COALESCE(thanh_tien, 0)) AS revenue
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

    const [rows] = await db.query<any[]>(
      `
      SELECT
        ${careerExpr} AS name,
        SUM(COALESCE(thanh_tien, 0)) AS revenue
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

    const [rows] = await db.query<any[]>(
      `
      SELECT
        COUNT(DISTINCT order_ID) AS totalOrders,
        SUM(COALESCE(quantity, 1)) AS totalQuantity,
        SUM(COALESCE(tien_hang, 0)) AS totalTienHang,
        SUM(COALESCE(thanh_tien, 0)) AS totalThanhTien
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

    const [rows] = await db.query<any[]>(
      `
      SELECT
        ${checkinStatusExpr} AS brand,
        COUNT(DISTINCT order_ID) AS orders
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

    const [rows] = await db.query<any[]>(
      `
      SELECT
        ${ticketClassExpr} AS kenh_ban,
        COUNT(DISTINCT order_ID) AS orders,
        SUM(COALESCE(quantity, 1)) AS quantity,
        SUM(COALESCE(tien_hang, 0)) AS tien_hang,
        SUM(COALESCE(giam_gia, 0)) AS giam_gia,
        SUM(COALESCE(thanh_tien, 0)) AS thanh_tien,
        SUM(
          CASE
            WHEN LOWER(COALESCE(status, '')) = 'paydone' THEN 1
            ELSE 0
          END
        ) AS paydone_count,
        SUM(
          CASE
            WHEN LOWER(COALESCE(status, '')) = 'paydone' THEN COALESCE(tien_hang, 0)
            ELSE 0
          END
        ) AS paydone_money,
        SUM(
          CASE
            WHEN LOWER(COALESCE(status, '')) = 'paydone' THEN COALESCE(thanh_tien, 0)
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

    const [rows] = await db.query<any[]>(
      `
      SELECT
        ${careerExpr} AS product,
        SUM(COALESCE(quantity, 1)) AS totalQuantity
      FROM orders
      WHERE ${dateFilter.clause}
      GROUP BY ${careerExpr}
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

    const [rows] = await db.query<any[]>(
      `
      SELECT
        ${genderExpr} AS seller,
        SUM(COALESCE(thanh_tien, 0)) AS totalRevenue,
        COUNT(DISTINCT order_ID) AS totalOrders
      FROM orders
      WHERE ${dateFilter.clause}
      GROUP BY ${genderExpr}
      ORDER BY totalRevenue DESC
      LIMIT ?
      `,
      [...dateFilter.params, limit],
    );

    return (rows ?? []).map((row) => ({
      seller: String(row.seller ?? "Khong ro"),
      revenue: Number(row.totalRevenue) || 0,
      orders: Number(row.totalOrders) || 0,
    }));
  },
  ["crm-top-sales-revenue"],
  { revalidate: 300 },
);
