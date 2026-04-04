// app/(main)/kenh/page.tsx
export const runtime = "nodejs";

import { getChannels } from "@/lib/orders";

import { DataTable } from "./_components/data-table";
import type { Channel } from "./_components/schema";

export default async function Page() {
  let channels: Channel[] = [];
  try {
    const res = await getChannels();
    channels = Array.isArray(res) ? res : [];
  } catch (e) {
    console.error("getChannels error:", e);
    channels = [];
  }

  return <DataTable data={channels} />;
}
