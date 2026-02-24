import { z } from "zod";

/* =========================
 * FILTER (dùng chung cho CRM)
 * ========================= */
export const DateFilterSchema = z.object({
  from: z.date().nullable().optional(),
  to: z.date().nullable().optional(),
});

export type DateFilter = z.infer<typeof DateFilterSchema>;

/* =========================
 * ORDERS TABLE
 * ========================= */
export const OrderSchema = z.object({
  order_ID: z.string(),
  brand: z.string(),
  create_time: z.coerce.date(),

  customer_ID: z.string(),
  name_customer: z.string(),
  phone: z.string(),
  address: z.string(),

  seller: z.string(),
  kenh_ban: z.string(),
  note: z.string().nullable().optional(),

  quantity: z.number(),

  tien_hang: z.number(),
  giam_gia: z.number(),
  thanh_tien: z.number(),

  status: z.string(),

  // product
  pro_ID: z.string(),
  name_pro: z.string(),
  brand_pro: z.string(),
});

export type Order = z.infer<typeof OrderSchema>;

/* =========================
 * CUSTOMERS TABLE
 * ========================= */
export const CustomerSchema = z.object({
  customer_ID: z.string(),
  name: z.string(),
  phone: z.string(),

  class: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  birth: z.coerce.date().nullable().optional(),

  company: z.string().nullable().optional(),
  address: z.string().nullable().optional(),

  create_by: z.string(),
  create_time: z.coerce.date(),

  last_payment: z.coerce.date().nullable().optional(),
  note: z.string().nullable().optional(),

  branch: z.string(),

  no_hien_tai: z.number(),
  tong_ban: z.number(),
  tong_ban_tru_tra_hang: z.number(),
});

export type Customer = z.infer<typeof CustomerSchema>;

/* =========================
 * CHART DATA (CRM)
 * ========================= */

/**
 * Dùng cho:
 * - Biểu đồ doanh thu theo ngày/tháng
 * - Biểu đồ số đơn
 */
export const RevenueChartPointSchema = z.object({
  date: z.string(), // YYYY-MM-DD
  orders: z.number(),
  revenue: z.number(),
});

export type RevenueChartPoint = z.infer<typeof RevenueChartPointSchema>;

/**
 * Funnel / trạng thái đơn
 */
export const OrderStatusChartSchema = z.object({
  status: z.string(),
  count: z.number(),
});

export type OrderStatusChart = z.infer<typeof OrderStatusChartSchema>;

/**
 * Doanh thu theo kênh bán
 */
export const RevenueByChannelSchema = z.object({
  kenh_ban: z.string(),
  revenue: z.number(),
});

export type RevenueByChannel = z.infer<typeof RevenueByChannelSchema>;

/**
 * Doanh thu theo sản phẩm
 */
export const RevenueByProductSchema = z.object({
  pro_ID: z.string(),
  name_pro: z.string(),
  revenue: z.number(),
  quantity: z.number(),
});

export type RevenueByProduct = z.infer<typeof RevenueByProductSchema>;

/**
 * Tổng hợp kênh bán
 */
export const ChannelSummarySchema = z.object({
  kenh_ban: z.string(),
  order_count: z.number(),
  quantity: z.number(),
  tien_hang: z.number(),
  giam_gia: z.number(),
  thanh_tien: z.number(),
  paydone_count: z.number(),
  paydone_money: z.number(),
  paydone_money_vat: z.number(),
});

export type ChannelSummary = z.infer<typeof ChannelSummarySchema>;

/* =========================
 * KPI CARDS
 * ========================= */
export const CrmKpiSchema = z.object({
  total_orders: z.number(),
  total_revenue: z.number(),
  total_customers: z.number(),
  new_customers: z.number(),
});

export type CrmKpi = z.infer<typeof CrmKpiSchema>;
