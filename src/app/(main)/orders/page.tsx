// app/(main)/kenh/page.tsx
export const runtime = "nodejs";

import { getChannels } from "@/lib/orders";

import OrdersDataTable from "./_components/data-table";
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

  return (
    <div className="flex min-h-0 min-w-0 flex-1 basis-0 overflow-hidden">
      <OrdersDataTable data={channels} />
    </div>
  );
}
