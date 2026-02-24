import { unstable_cache } from "next/cache";

import {
  buildRevenueHorizontalBars,
  buildRevenuePie,
  type RevenueGroupRow,
} from "@/app/(main)/dashboard/crm/_components/crm.config";
import { getDB } from "@/lib/db";

type ChartResult = ReturnType<typeof buildRevenuePie>;

function mapRows(rows: any[]): RevenueGroupRow[] {
  return (rows ?? []).map((r) => ({
    name: String(r.name ?? "Không rõ"),
    revenue: Number(r.revenue) || 0,
  }));
}

function buildDateFilter(from?: Date, to?: Date) {
  if (!from && !to) return { clause: "", params: [] as (Date | number)[] };

  const params: (Date | number)[] = [];
  let clause = "";

  if (from && to) {
    clause = "create_at >= ? AND create_at <= ?";
    params.push(from, to);
  } else if (from) {
    clause = "create_at >= ?";
    params.push(from);
  } else if (to) {
    clause = "create_at <= ?";
    params.push(to);
  }

  return { clause, params };
}

// ====== Doanh thu theo kênh bán ======
export const getRevenueByChannelChart = unstable_cache(
  async (from?: Date, to?: Date): Promise<ChartResult> => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const whereClause = dateFilter.clause || "1=1";

    const [rows] = await db.query<any[]>(
      `
            SELECT COALESCE(class, 'Không rõ') AS name,
              SUM(COALESCE(money_VAT, 0)) AS revenue
            FROM checkin_orders
      WHERE ${whereClause}
            GROUP BY COALESCE(class, 'Không rõ')
      ORDER BY revenue DESC
      `,
      dateFilter.params,
    );

    return buildRevenuePie(mapRows(rows), "Doanh thu");
  },
  ["crm-revenue-by-channel"],
  { revalidate: 300 },
);

export const getRevenueByBranchBarChart = unstable_cache(
  async (from?: Date, to?: Date, limit: number = 12) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const whereClause = dateFilter.clause || "1=1";

    const [rows] = await db.query<any[]>(
      `
            SELECT COALESCE(career, 'Không rõ') AS name,
              SUM(COALESCE(money_VAT, 0)) AS revenue
            FROM checkin_orders
      WHERE ${whereClause}
            GROUP BY COALESCE(career, 'Không rõ')
      ORDER BY revenue DESC
      LIMIT ?
      `,
      [...dateFilter.params, limit],
    );

    const mapped: RevenueGroupRow[] = (rows ?? []).map((r) => ({
      name: String(r.name ?? "Không rõ"),
      revenue: Number(r.revenue) || 0,
    }));

    return buildRevenueHorizontalBars(mapped);
  },
  ["crm-revenue-branch-bars"],
  { revalidate: 300 },
);

// ====== Thống kê tổng quan ======
export const getCRMStats = unstable_cache(
  async (from?: Date, to?: Date) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const whereClause = dateFilter.clause || "1=1";

    const [rows] = await db.query<any[]>(
      `
      SELECT 
        COUNT(DISTINCT orderCode) AS totalOrders,
        COUNT(*) AS totalQuantity,
        SUM(COALESCE(money, 0)) AS totalTienHang,
        SUM(COALESCE(money_VAT, 0)) AS totalThanhTien
      FROM checkin_orders
      WHERE ${whereClause}
      `,
      dateFilter.params,
    );

    const row = rows[0] || {};
    return {
      totalOrders: Number(row.totalOrders) || 0,
      totalQuantity: Number(row.totalQuantity) || 0,
      totalTienHang: Number(row.totalTienHang) || 0,
      totalThanhTien: Number(row.totalThanhTien) || 0,
    };
  },
  ["crm-stats"],
  { revalidate: 300 },
);

// ====== Phễu chuyển đổi theo thương hiệu ======
export const getBrandConversionFunnel = unstable_cache(
  async (from?: Date, to?: Date) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const whereClause = dateFilter.clause || "1=1";

    const [rows] = await db.query<any[]>(
      `
      SELECT 
        COALESCE(status_checkin, 'Không rõ') AS brand,
        COUNT(DISTINCT orderCode) AS orders
      FROM checkin_orders
      WHERE ${whereClause}
      GROUP BY COALESCE(status_checkin, 'Không rõ')
      ORDER BY orders DESC
      LIMIT 5
      `,
      dateFilter.params,
    );

    const colors = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)", "var(--chart-5)"];
    return (rows ?? []).map((r, idx) => ({
      stage: String(r.brand ?? "Không rõ"),
      value: Number(r.orders) || 0,
      fill: colors[idx % 5],
    }));
  },
  ["crm-brand-funnel"],
  { revalidate: 300 },
);

// ====== Tổng hợp kênh bán ======
export const getChannelSalesSummary = unstable_cache(
  async (from?: Date, to?: Date) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const whereClause = dateFilter.clause || "1=1";

    const [rows] = await db.query<any[]>(
      `
      SELECT
        COALESCE(class, 'Không rõ') AS kenh_ban,
        COUNT(DISTINCT orderCode) AS orders,
        COUNT(*) AS quantity,
        SUM(COALESCE(money, 0)) AS tien_hang,
        0 AS giam_gia,
        SUM(COALESCE(money_VAT, 0)) AS thanh_tien,
        SUM(
          CASE
            WHEN LOWER(COALESCE(trang_thai_thanh_toan, '')) = 'paydone' THEN 1
            ELSE 0
          END
        ) AS paydone_count,
        SUM(
          CASE
            WHEN LOWER(COALESCE(trang_thai_thanh_toan, '')) = 'paydone' THEN COALESCE(money, 0)
            ELSE 0
          END
        ) AS paydone_money,
        SUM(
          CASE
            WHEN LOWER(COALESCE(trang_thai_thanh_toan, '')) = 'paydone' THEN COALESCE(money_VAT, 0)
            ELSE 0
          END
        ) AS paydone_money_vat
      FROM checkin_orders
      WHERE ${whereClause}
      GROUP BY COALESCE(class, 'Không rõ')
      ORDER BY thanh_tien DESC
      `,
      dateFilter.params,
    );

    return (rows ?? []).map((r) => ({
      kenh_ban: String(r.kenh_ban ?? "Không rõ"),
      order_count: Number(r.orders) || 0,
      quantity: Number(r.quantity) || 0,
      tien_hang: Number(r.tien_hang) || 0,
      giam_gia: Number(r.giam_gia) || 0,
      thanh_tien: Number(r.thanh_tien) || 0,
      paydone_count: Number(r.paydone_count) || 0,
      paydone_money: Number(r.paydone_money) || 0,
      paydone_money_vat: Number(r.paydone_money_vat) || 0,
    }));
  },
  ["crm-channel-sales-summary"],
  { revalidate: 300 },
);

// ====== Top sản phẩm bán chạy theo số lượng ======
export const getTopProductsByQuantity = unstable_cache(
  async (from?: Date, to?: Date, limit: number = 10) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const whereClause = dateFilter.clause || "1=1";

    const [rows] = await db.query<any[]>(
      `
      SELECT 
        COALESCE(career, 'Không rõ') AS product,
        COUNT(*) AS totalQuantity
      FROM checkin_orders
      WHERE ${whereClause}
      GROUP BY COALESCE(career, 'Không rõ')
      ORDER BY totalQuantity DESC
      LIMIT ?
      `,
      [...dateFilter.params, limit],
    );

    const total = (rows ?? []).reduce((sum, r) => sum + (Number(r.totalQuantity) || 0), 0);

    return (rows ?? []).map((r) => {
      const quantity = Number(r.totalQuantity) || 0;
      return {
        product: String(r.product ?? "Không rõ"),
        quantity,
        percentage: total > 0 ? Math.round((quantity / total) * 100) : 0,
      };
    });
  },
  ["crm-top-products-quantity"],
  { revalidate: 300 },
);

// ====== Top sales theo doanh thu ======
export const getTopSalesByRevenue = unstable_cache(
  async (from?: Date, to?: Date, limit: number = 5) => {
    const db = getDB();
    const dateFilter = buildDateFilter(from, to);

    const whereClause = dateFilter.clause || "1=1";

    const [rows] = await db.query<any[]>(
      `
      SELECT 
        COALESCE(gender, 'Không rõ') AS seller,
        SUM(COALESCE(money_VAT, 0)) AS totalRevenue,
        COUNT(DISTINCT orderCode) AS totalOrders
      FROM checkin_orders
      WHERE ${whereClause}
      GROUP BY COALESCE(gender, 'Không rõ')
      ORDER BY totalRevenue DESC
      LIMIT ?
      `,
      [...dateFilter.params, limit],
    );

    return (rows ?? []).map((r) => ({
      seller: String(r.seller ?? "Không rõ"),
      revenue: Number(r.totalRevenue) || 0,
      orders: Number(r.totalOrders) || 0,
    }));
  },
  ["crm-top-sales-revenue"],
  { revalidate: 300 },
);
