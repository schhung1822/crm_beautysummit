// app/(main)/kenh/page.tsx
export const runtime = "nodejs";

import { getChannels } from "@/lib/orders";

import { DataTable } from "./_components/data-table";

export default async function Page() {
  let channels: any[] = [];
  try {
    const res = await getChannels();
    channels = Array.isArray(res) ? res : [];
  } catch (e) {
    console.error("getChannels error:", e);
    channels = [];
  }

  const stats = {
    totalOrders: channels.length,
    totalMoney: channels.reduce((s, c) => s + (Number(c.money) || 0), 0),
    totalMoneyVAT: channels.reduce((s, c) => s + (Number(c.money_VAT) || 0), 0),
  };

  return <DataTable data={channels} />;
}
