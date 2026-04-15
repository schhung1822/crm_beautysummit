import { z } from "zod";

export const accountUserSchema = z.object({
  id: z.number(),
  user_id: z.string(),
  username: z.string(),
  email: z.string(),
  zid: z.string(),
  phone: z.string(),
  name: z.string(),
  avatar: z.string(),
  role: z.string(),
  status: z.string(),
  last_login: z.date().nullable(),
  create_time: z.date().nullable(),
  update_time: z.date().nullable(),
});

export type AccountUser = z.infer<typeof accountUserSchema>;
