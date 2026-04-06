/* eslint-disable unicorn/filename-case */
import type { Channel } from "@/app/(main)/dashboard/default/_components/schema";
import { getChannels as getTicketChannels } from "@/lib/orders";

type GetChannelsParams = {
  from?: string | Date;
  to?: string | Date;
};

function toDate(value?: string | Date) {
  if (!value) {
    return undefined;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? undefined : parsed;
}

export async function getChannels(params: GetChannelsParams = {}): Promise<Channel[]> {
  const from = toDate(params.from);
  const to = toDate(params.to);

  return getTicketChannels({
    from,
    to,
    limit: 10000,
    offset: 0,
  });
}
