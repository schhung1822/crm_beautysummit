// src/app/(main)/dashboard/default/_components/schema.ts
import { z } from "zod";

export const academySchema = z.object({
  ordercode: z.string(),
  name: z.string(),
  phone: z.string(),
  email: z.string(),
  gender: z.string(),
  time_vote: z.date().nullable(),
  brand_id: z.string(),
  brand_name: z.string(),
  category: z.string(),
  product: z.string(),
  voted: z.string(),
  link: z.string(),
});

export type Academy = z.infer<typeof academySchema>;
