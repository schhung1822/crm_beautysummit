import { getChannels } from "@/lib/orders";

import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import type { Stats } from "./_components/columns";
import { DataTable } from "./_components/data-table";
import { DateRangeFilter } from "./_components/date-range-filter";
import type { Channel } from "./_components/schema";
import { SectionCards } from "./_components/section-cards";

type ChartDataPoint = { orders: number; revenue: number };

function isCompletedStatus(status: string) {
  const normalized = status.trim().toLowerCase();

  return (
    normalized === "paydone" ||
    normalized === "paid" ||
    normalized === "completed" ||
    normalized.includes("hoàn thành") ||
    normalized.includes("thành công") ||
    normalized.includes("đã thanh toán")
  );
}

function buildChartData(channels: Channel[]): { date: string; orders: number; revenue: number }[] {
  const chartMap = new Map<string, ChartDataPoint>();
  for (const c of channels) {
    if (!c.create_time) continue;
    const d = c.create_time instanceof Date ? c.create_time : new Date(String(c.create_time));
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    const existing = chartMap.get(key);
    if (existing) {
      existing.orders += 1;
      existing.revenue += Number(c.money_VAT) || 0;
    } else {
      chartMap.set(key, { orders: 1, revenue: Number(c.money_VAT) || 0 });
    }
  }

  return Array.from(chartMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, { orders, revenue }]) => ({ date, orders, revenue }));
}

function computeTotals(channels: Channel[]): {
  registeredCount: number;
  completedCount: number;
  totalVat: number;
} {
  return channels.reduce<{ registeredCount: number; completedCount: number; totalVat: number }>(
    (acc, channel) => {
      const isCompleted = isCompletedStatus(channel.status);

      acc.registeredCount += 1;
      acc.completedCount += isCompleted ? 1 : 0;
      acc.totalVat += isCompleted ? Number(channel.money_VAT) || 0 : 0;
      return acc;
    },
    { registeredCount: 0, completedCount: 0, totalVat: 0 },
  );
}

async function fetchData(from?: Date, to?: Date): Promise<{ channels: Channel[] }> {
  try {
    const res = await getChannels({ from, to, limit: 10000 });
    const channels = Array.isArray(res) ? res : [];
    return { channels };
  } catch (e) {
    console.error("getChannels error:", e);
    return { channels: [] };
  }
}

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(params.to) : undefined;

  // Ensure toDate is end of day
  if (to) {
    to.setHours(23, 59, 59, 999);
  }

  const { channels } = await fetchData(from, to);
  const totals = computeTotals(channels);
  const chartData = buildChartData(channels);
  const orderStats: Stats = {
    totalOrders: channels.length,
    totalMoney: channels.reduce((sum, channel) => sum + (Number(channel.money) || 0), 0),
    totalMoneyVAT: channels.reduce((sum, channel) => sum + (Number(channel.money_VAT) || 0), 0),
  };

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DateRangeFilter />
      <SectionCards stats={totals} />
      <ChartAreaInteractive chartData={chartData} />
      <DataTable data={channels} stats={orderStats} />
    </div>
  );
}
