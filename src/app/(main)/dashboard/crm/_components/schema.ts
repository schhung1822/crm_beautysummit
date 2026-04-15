import { z } from "zod";

export const DateFilterSchema = z.object({
  from: z.date().nullable().optional(),
  to: z.date().nullable().optional(),
});

export type DateFilter = z.infer<typeof DateFilterSchema>;

export const OrderSchema = z.object({
  ordercode: z.string(),
  create_time: z.coerce.date(),
  customer_id: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  gender: z.string(),
  class: z.string(),
  money: z.number(),
  money_VAT: z.number(),
  status: z.string(),
  career: z.string(),
  is_checkin: z.number(),
  number_checkin: z.number(),
  checkin_time: z.coerce.date().nullable().optional(),
});

export type Order = z.infer<typeof OrderSchema>;

export const CustomerSchema = z.object({
  customer_ID: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string().nullable().optional(),
  gender: z.string().nullable().optional(),
  career: z.string().nullable().optional(),
  user_ip: z.string().nullable().optional(),
  user_agent: z.string().nullable().optional(),
  fbp: z.string().nullable().optional(),
  fbc: z.string().nullable().optional(),
  create_time: z.coerce.date().nullable().optional(),
});

export type Customer = z.infer<typeof CustomerSchema>;

export const RevenueChartPointSchema = z.object({
  date: z.string(),
  orders: z.number(),
  revenue: z.number(),
});

export type RevenueChartPoint = z.infer<typeof RevenueChartPointSchema>;

export const OrderStatusChartSchema = z.object({
  status: z.string(),
  count: z.number(),
});

export type OrderStatusChart = z.infer<typeof OrderStatusChartSchema>;

export const RevenueByChannelSchema = z.object({
  kenh_ban: z.string(),
  revenue: z.number(),
});

export type RevenueByChannel = z.infer<typeof RevenueByChannelSchema>;

export const RevenueByProductSchema = z.object({
  product: z.string(),
  revenue: z.number(),
  quantity: z.number(),
});

export type RevenueByProduct = z.infer<typeof RevenueByProductSchema>;

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

export const CrmKpiSchema = z.object({
  total_orders: z.number(),
  total_revenue: z.number(),
  total_customers: z.number(),
  new_customers: z.number(),
});

export type CrmKpi = z.infer<typeof CrmKpiSchema>;
