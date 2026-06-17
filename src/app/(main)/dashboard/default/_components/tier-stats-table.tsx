"use client";

import * as React from "react";

import type { Channel } from "./schema";

type TierRow = {
  tier: string;
  registered: number;
  sold: number;
  purchased: number;
  gifted: number;
  totalTickets: number;
  rate: number;
  revenue: number;
};

type TierStats = Omit<TierRow, "tier" | "rate">;

const TIER_ORDER = ["GOLD", "RUBY", "VIP"];

const EMPTY_TIER_STATS: TierStats = {
  registered: 0,
  sold: 0,
  purchased: 0,
  gifted: 0,
  totalTickets: 0,
  revenue: 0,
};

const TIER_STYLE: Partial<Record<string, { label: string; dotClass: string; badgeClass: string }>> = {
  GOLD: {
    label: "Gold",
    dotClass: "bg-[#d5b48c]",
    badgeClass: "border-[#8B735540] bg-[#8B735518] text-[#d5b48c]",
  },
  RUBY: {
    label: "Ruby",
    dotClass: "bg-[#ffd978]",
    badgeClass: "border-[#d8ab2b40] bg-[#d8ab2b18] text-[#ffd978]",
  },
  VIP: {
    label: "VIP",
    dotClass: "bg-[#ff86c8]",
    badgeClass: "border-[#C41E7F40] bg-[#C41E7F18] text-[#ff86c8]",
  },
};

function isCompleted(status: string) {
  const s = status.trim().toLowerCase();
  return (
    s === "paydone" ||
    s === "paid" ||
    s === "completed" ||
    s.includes("hoàn thành") ||
    s.includes("thành công") ||
    s.includes("đã thanh toán") ||
    s.includes("hoÃ n thÃ nh") ||
    s.includes("thÃ nh cÃ´ng") ||
    s.includes("Ä‘Ã£ thanh toÃ¡n")
  );
}

function normalizeTier(ticketClass: string) {
  return ticketClass.trim().toUpperCase() || "KHÁC";
}

function rowFromStats(tier: string, stats: TierStats): TierRow {
  return {
    tier,
    ...stats,
    rate: stats.registered > 0 ? (stats.sold / stats.registered) * 100 : 0,
  };
}

function applyChannelToStats(stats: TierStats, ch: Channel) {
  const money = Number(ch.money) || 0;
  const isGift = Number(ch.is_gift);
  const isPaidRegistration = isGift === 0 && money !== 0;
  const isGiftTicket = isGift === 1 && money === 0;

  if (isPaidRegistration) {
    stats.registered += 1;
    stats.purchased += 1;
    stats.totalTickets += 1;
  }

  if (isPaidRegistration && isCompleted(ch.status)) {
    stats.sold += 1;
    stats.revenue += money;
  }

  if (isGiftTicket) {
    stats.gifted += 1;
    stats.totalTickets += 1;
  }
}

function buildTotalRow(rows: TierRow[]): TierRow {
  const total = rows.reduce<TierStats>(
    (acc, r) => ({
      registered: acc.registered + r.registered,
      sold: acc.sold + r.sold,
      purchased: acc.purchased + r.purchased,
      gifted: acc.gifted + r.gifted,
      totalTickets: acc.totalTickets + r.totalTickets,
      revenue: acc.revenue + r.revenue,
    }),
    { ...EMPTY_TIER_STATS },
  );

  return rowFromStats("__TOTAL__", total);
}

function buildTierRows(channels: Channel[]): TierRow[] {
  const map = new Map<string, TierStats>();

  for (const ch of channels) {
    const tier = normalizeTier(ch.class);
    const existing = map.get(tier) ?? { ...EMPTY_TIER_STATS };
    applyChannelToStats(existing, ch);
    map.set(tier, existing);
  }

  const rows: TierRow[] = [];
  for (const tier of TIER_ORDER) {
    const stats = map.get(tier);
    if (stats) {
      rows.push(rowFromStats(tier, stats));
      map.delete(tier);
    }
  }

  for (const [tier, stats] of map.entries()) {
    rows.push(rowFromStats(tier, stats));
  }

  rows.push(buildTotalRow(rows));
  return rows;
}

function fmt(n: number) {
  return n.toLocaleString("vi-VN");
}

function TierCell({ row }: { row: TierRow }) {
  const isTotal = row.tier === "__TOTAL__";
  const style = TIER_STYLE[row.tier];

  if (isTotal) {
    return <span className="text-foreground font-bold">Tổng cộng</span>;
  }

  if (style) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${style.badgeClass}`}
      >
        <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dotClass}`} />
        {style.label}
      </span>
    );
  }

  return <span className="text-foreground">{row.tier}</span>;
}

function RateCell({ rate }: { rate: number }) {
  return (
    <div className="flex min-w-32 flex-col items-center gap-1.5">
      <span className="text-foreground text-xs font-semibold tabular-nums">{rate.toFixed(1)}%</span>
      <div className="bg-muted h-1.5 w-full overflow-hidden rounded-full">
        <div
          className="bg-primary h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(rate, 100)}%` }}
        />
      </div>
    </div>
  );
}

function EmptyValue() {
  return <span className="text-muted-foreground/50">-</span>;
}

export function TierStatsTable({ data }: { data: Channel[] }) {
  const rows = React.useMemo(() => buildTierRows(data), [data]);
  const totalRow = rows.find((r) => r.tier === "__TOTAL__");

  return (
    <div className="grid grid-cols-1 gap-4 2xl:grid-cols-2">
      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <div className="border-border flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <div className="text-foreground text-[18px] font-semibold">Thống kê vé bán</div>
          </div>
          <div className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {fmt(totalRow?.sold ?? 0)} vé thanh toán
          </div>
        </div>

        <div className="nice-scroll overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/30 border-b">
                <th className="text-muted-foreground px-5 py-3 text-left font-semibold whitespace-nowrap">Hạng vé</th>
                <th className="text-muted-foreground px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Vé đăng ký
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Vé thanh toán
                </th>
                <th className="text-muted-foreground px-4 py-3 text-left font-semibold whitespace-nowrap">
                  Vé chưa thanh toán
                </th>
                <th className="text-muted-foreground w-40 px-4 py-3 text-center font-semibold whitespace-nowrap">
                  Tỷ lệ chuyển đổi
                </th>
                <th className="text-muted-foreground px-5 py-3 text-right font-semibold whitespace-nowrap">
                  Doanh thu
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isTotal = row.tier === "__TOTAL__";
                const unpaid = Math.max(row.registered - row.sold, 0);

                return (
                  <tr
                    key={row.tier}
                    className={
                      isTotal
                        ? "border-border bg-muted/20 border-t-2 font-bold"
                        : i % 2 === 0
                          ? "border-border/50 border-b"
                          : "border-border/50 bg-muted/10 border-b"
                    }
                  >
                    <td className="px-5 py-3.5">
                      <TierCell row={row} />
                    </td>
                    <td className="text-foreground px-4 py-3.5 text-left tabular-nums">{fmt(row.registered)}</td>
                    <td className="text-foreground px-4 py-3.5 text-left tabular-nums">{fmt(row.sold)}</td>
                    <td className="text-foreground px-4 py-3.5 text-left tabular-nums">
                      {unpaid > 0 ? fmt(unpaid) : <EmptyValue />}
                    </td>
                    <td className="px-4 py-3.5">
                      <RateCell rate={row.rate} />
                    </td>
                    <td className="text-foreground px-5 py-3.5 text-right font-semibold tabular-nums">
                      {fmt(row.revenue)}
                      <span className="text-muted-foreground ml-1 text-[10px] font-normal">VND</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="border-border bg-card overflow-hidden rounded-xl border">
        <div className="border-border flex items-start justify-between gap-4 border-b px-5 py-4">
          <div>
            <div className="text-foreground text-[18px] font-semibold">Thống kê tổng số vé</div>
          </div>
          <div className="text-muted-foreground shrink-0 text-xs tabular-nums">
            {fmt(totalRow?.totalTickets ?? 0)} vé tổng
          </div>
        </div>

        <div className="nice-scroll overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-border bg-muted/30 border-b">
                <th className="text-muted-foreground px-5 py-3 text-left font-semibold whitespace-nowrap">Hạng vé</th>
                <th className="text-muted-foreground px-4 py-3 text-right font-semibold whitespace-nowrap">Vé mua</th>
                <th className="text-muted-foreground px-4 py-3 text-right font-semibold whitespace-nowrap">Vé tặng</th>
                <th className="text-muted-foreground px-5 py-3 text-right font-semibold whitespace-nowrap">
                  Tổng số vé
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row, i) => {
                const isTotal = row.tier === "__TOTAL__";

                return (
                  <tr
                    key={row.tier}
                    className={
                      isTotal
                        ? "border-border bg-muted/20 border-t-2 font-bold"
                        : i % 2 === 0
                          ? "border-border/50 border-b"
                          : "border-border/50 bg-muted/10 border-b"
                    }
                  >
                    <td className="px-5 py-3.5">
                      <TierCell row={row} />
                    </td>
                    <td className="text-foreground px-4 py-3.5 text-right tabular-nums">{fmt(row.purchased)}</td>
                    <td className="text-foreground px-4 py-3.5 text-right tabular-nums">
                      {row.gifted > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                          {fmt(row.gifted)}
                        </span>
                      ) : (
                        <EmptyValue />
                      )}
                    </td>
                    <td className="text-foreground px-5 py-3.5 text-right font-semibold tabular-nums">
                      {fmt(row.totalTickets)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
