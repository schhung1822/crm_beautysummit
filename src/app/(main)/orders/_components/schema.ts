import { z } from "zod";

export const channelSchema = z.object({
  ordercode: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  class: z.string(),
  money: z.number(),
  money_VAT: z.number(),
  status: z.string(),
  update_time: z.date().nullable(),
  create_time: z.date().nullable(),
  gender: z.string(),
  career: z.string(),
  is_checkin: z.number().default(0),
  number_checkin: z.number().default(0),
  status_checkin: z.string(),
  checkin_time: z.date().nullable(),
});

export type Channel = z.infer<typeof channelSchema>;
