"use client";

import * as React from "react";

import type { Channel } from "./schema";

type TierRow = {
  tier: string;
  registered: number;
  sold: number;
  gifted: number;
  rate: number;
  revenue: number;
};

const TIER_ORDER = ["GOLD", "RUBY", "VIP"];

const TIER_STYLE: Record<string, { label: string; dotClass: string; badgeClass: string }> = {
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
    s.includes("đã thanh toán")
  );
}

function buildTierRows(channels: Channel[]): TierRow[] {
  const map = new Map<
    string,
    { registered: number; sold: number; gifted: number; revenue: number }
  >();

  for (const ch of channels) {
    const tier = String(ch.class ?? "").trim().toUpperCase() || "KHÁC";
    const existing = map.get(tier) ?? { registered: 0, sold: 0, gifted: 0, revenue: 0 };
    existing.registered += 1;

    const completed = isCompleted(ch.status);
    if (completed) {
      existing.sold += 1;
      existing.revenue += Number(ch.money) || 0;
    }

    // Vé tặng: voucher field có giá trị thực
    const hasVoucher = String(ch.voucher ?? "").trim() !== "";
    if (hasVoucher) existing.gifted += 1;

    map.set(tier, existing);
  }

  // Sort: known tiers first
  const rows: TierRow[] = [];
  for (const tier of TIER_ORDER) {
    if (map.has(tier)) {
      const d = map.get(tier)!;
      rows.push({
        tier,
        ...d,
        rate: d.registered > 0 ? (d.sold / d.registered) * 100 : 0,
      });
      map.delete(tier);
    }
  }
  for (const [tier, d] of map.entries()) {
    rows.push({
      tier,
      ...d,
      rate: d.registered > 0 ? (d.sold / d.registered) * 100 : 0,
    });
  }

  // Totals row
  const total = rows.reduce(
    (acc, r) => ({
      registered: acc.registered + r.registered,
      sold: acc.sold + r.sold,
      gifted: acc.gifted + r.gifted,
      revenue: acc.revenue + r.revenue,
    }),
    { registered: 0, sold: 0, gifted: 0, revenue: 0 },
  );
  rows.push({
    tier: "__TOTAL__",
    ...total,
    rate: total.registered > 0 ? (total.sold / total.registered) * 100 : 0,
  });

  return rows;
}

function fmt(n: number) {
  return n.toLocaleString("vi-VN");
}

export function TierStatsTable({ data }: { data: Channel[] }) {
  const rows = React.useMemo(() => buildTierRows(data), [data]);

  return (
    <div className="rounded-xl border border-border bg-card overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-4 border-b border-border px-5 py-4">
        <div>
          <div className="text-sm font-semibold text-foreground text-[18px]">Thống kê theo hạng vé</div>
          <div className="mt-0.5 text-xs text-muted-foreground">
            Tổng hợp vé đăng ký, vé bán, vé tặng và doanh thu theo từng hạng
          </div>
        </div>
        <div className="text-xs text-muted-foreground tabular-nums">
          {rows.find((r) => r.tier === "__TOTAL__")?.registered ?? 0} vé tổng
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-muted/30">
              <th className="px-5 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">
                Hạng vé
              </th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">
                Vé đăng ký
              </th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">
                Vé bán ra
              </th>
              <th className="px-4 py-3 text-left font-semibold text-muted-foreground whitespace-nowrap">
                Vé tặng
              </th>
              <th className="px-4 py-3 text-center font-semibold text-muted-foreground whitespace-nowrap w-40">
                Tỷ lệ chuyển đổi
              </th>
              <th className="px-5 py-3 text-right font-semibold text-muted-foreground whitespace-nowrap">
                Doanh thu
              </th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const isTotal = row.tier === "__TOTAL__";
              const style = TIER_STYLE[row.tier];
              return (
                <tr
                  key={row.tier}
                  className={
                    isTotal
                      ? "border-t-2 border-border bg-muted/20 font-bold"
                      : i % 2 === 0
                        ? "border-b border-border/50"
                        : "border-b border-border/50 bg-muted/10"
                  }
                >
                  {/* Hạng vé */}
                  <td className="px-5 py-3.5">
                    {isTotal ? (
                      <span className="text-foreground font-bold">Tổng cộng</span>
                    ) : style ? (
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-bold ${style.badgeClass}`}
                      >
                        <span className={`inline-block h-1.5 w-1.5 rounded-full ${style.dotClass}`} />
                        {style.label}
                      </span>
                    ) : (
                      <span className="text-foreground">{row.tier}</span>
                    )}
                  </td>

                  {/* Vé đăng ký */}
                  <td className="px-4 py-3.5 text-left tabular-nums text-foreground">
                    {fmt(row.registered)}
                  </td>

                  {/* Vé bán ra */}
                  <td className="px-4 py-3.5 text-left tabular-nums text-foreground">
                    {fmt(row.sold)}
                  </td>

                  {/* Vé tặng */}
                  <td className="px-4 py-3.5 text-left tabular-nums text-foreground">
                    {row.gifted > 0 ? (
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-400" />
                        {fmt(row.gifted)}
                      </span>
                    ) : (
                      <span className="text-muted-foreground/50">—</span>
                    )}
                  </td>

                  {/* Tỷ lệ */}
                  <td className="px-4 py-3.5">
                    <div className="flex flex-col items-center gap-1.5">
                      <span className="text-xs font-semibold text-foreground tabular-nums">
                        {row.rate.toFixed(1)}%
                      </span>
                      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                        <div
                          className="h-full rounded-full bg-primary transition-all duration-500"
                          style={{ width: `${Math.min(row.rate, 100)}%` }}
                        />
                      </div>
                    </div>
                  </td>

                  {/* Doanh thu */}
                  <td className="px-5 py-3.5 text-right tabular-nums font-semibold text-foreground">
                    {fmt(row.revenue)}
                    <span className="ml-1 text-[10px] font-normal text-muted-foreground">₫</span>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
