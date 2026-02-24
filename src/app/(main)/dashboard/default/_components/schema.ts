// src/app/(main)/dashboard/default/_components/schema.ts
import { z } from "zod";

export const channelSchema = z.object({
  orderCode: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  class: z.string(),
  money: z.number(),
  money_VAT: z.number(),
  trang_thai_thanh_toan: z.string(),
  update_time: z.date().nullable(),
  create_at: z.date().nullable(),
  gender: z.string(),
  career: z.string(),
  status_checkin: z.string(),
  date_checkin: z.date().nullable(),
});

export type Channel = z.infer<typeof channelSchema>;
