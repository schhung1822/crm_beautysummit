import { z } from "zod";

export const userSchema = z.object({
  customer_ID: z.string(),
  name: z.string(),
  gender: z.string(),
  phone: z.string(),
  email: z.string(),
  career: z.string(),
  user_ip: z.string(),
  user_agent: z.string(),
  fbp: z.string(),
  fbc: z.string(),
  create_time: z.date().nullable(),
});

export type Users = z.infer<typeof userSchema>;
