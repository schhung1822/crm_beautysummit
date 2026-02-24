import { getChannelSalesSummary } from "@/lib/crm-revenue";
import { getChannels } from "@/lib/orders";

import { TableCards } from "../crm/_components/table-cards";

import { ChartAreaInteractive } from "./_components/chart-area-interactive";
import { DateRangeFilter } from "./_components/date-range-filter";
import { SectionCards } from "./_components/section-cards";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const params = await searchParams;
  const from = params.from ? new Date(params.from) : undefined;
  const to = params.to ? new Date(params.to) : undefined;

  // Ensure toDate is end of day
  if (to) {
    to.setHours(23, 59, 59, 999);
  }

  let channels: any[] = [];
  let channelSummary: any[] = [];
  try {
    const res = await getChannels({ from, to, limit: 10000 });
    channels = Array.isArray(res) ? res : [];
    channelSummary = await getChannelSalesSummary(from, to);
  } catch (e) {
    console.error("getChannels error:", e);
    channels = [];
    channelSummary = [];
  }

  const totals = channelSummary.reduce(
    (acc, cur) => {
      acc.registeredCount += Number(cur.quantity) || 0;
      acc.completedCount += Number(cur.paydone_count) || 0;
      acc.totalVat += Number(cur.paydone_money_vat) || 0;
      return acc;
    },
    { registeredCount: 0, completedCount: 0, totalVat: 0 },
  );

  const stats = {
    registeredCount: totals.registeredCount,
    completedCount: totals.completedCount,
    totalVat: totals.totalVat,
  };

  // Build chart data (group by date)
  const chartMap: Record<string, { orders: number; revenue: number }> = {};
  for (const c of channels) {
    const d = c.create_at instanceof Date ? c.create_at : new Date(c.create_at);
    const key = d.toISOString().slice(0, 10); // YYYY-MM-DD
    chartMap[key] ??= { orders: 0, revenue: 0 };
    chartMap[key].orders += 1;
    chartMap[key].revenue += Number(c.money_VAT) || 0;
  }

  const chartData = Object.keys(chartMap)
    .sort()
    .map((date) => ({ date, orders: chartMap[date].orders, revenue: chartMap[date].revenue }));

  return (
    <div className="@container/main flex flex-col gap-4 md:gap-6">
      <DateRangeFilter />
      <SectionCards stats={stats} />
      <ChartAreaInteractive chartData={chartData} />
      <TableCards channels={channelSummary} />
    </div>
  );
}
