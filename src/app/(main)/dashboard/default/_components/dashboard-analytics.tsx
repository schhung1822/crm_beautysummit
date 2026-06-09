"use client";

import * as React from "react";

import { useSearchParams } from "next/navigation";

import { Cell, Pie, PieChart, Tooltip, Legend, ResponsiveContainer } from "recharts";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { fetchChannelsByDateRange } from "@/server/server-actions";

import type { Channel } from "./schema";
import { TierStatsTable } from "./tier-stats-table";

// ─── helpers ─────────────────────────────────────────────────────────────────

const PALETTE = [
  "#d5b48c", "#ffd978", "#ff86c8", "#60a5fa", "#34d399",
  "#f87171", "#a78bfa", "#fb923c", "#38bdf8", "#4ade80",
];

function buildPieData(
  items: string[],
  limit = 8,
  labelMap?: Record<string, string>,
): { name: string; value: number }[] {
  const map = new Map<string, number>();
  for (const raw of items) {
    const key = raw.trim() || "Không xác định";
    map.set(key, (map.get(key) ?? 0) + 1);
  }
  const sorted = Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, limit);
  const rest = sorted.slice(limit).reduce((s, [, v]) => s + v, 0);

  const result = top.map(([name, value]) => ({
    name: labelMap?.[name] ?? name,
    value,
  }));
  if (rest > 0) result.push({ name: "Khác", value: rest });
  return result;
}

const GENDER_MAP: Record<string, string> = {
  f: "Nữ", female: "Nữ", nữ: "Nữ", nu: "Nữ",
  m: "Nam", male: "Nam", nam: "Nam",
};

function normalizeGender(raw: string): string {
  const v = raw.trim().toLowerCase();
  if (!v) return "Không xác định";
  return GENDER_MAP[v] ?? raw.trim();
}

// ─── Donut card ───────────────────────────────────────────────────────────────

type DonutProps = {
  title: string;
  description: string;
  data: { name: string; value: number }[];
};

function DonutCard({ title, description, data }: DonutProps) {
  const total = data.reduce((s, d) => s + d.value, 0);
  const isEmpty = total === 0;

  return (
    <Card className="flex flex-col">
      <CardHeader className="pb-0">
        <CardTitle className="text-sm font-semibold pt-4">{title}</CardTitle>
        <CardDescription className="text-xs">{description}</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col items-center py-4">
        {isEmpty ? (
          <div className="flex h-48 items-center justify-center text-xs text-muted-foreground">
            Không có dữ liệu
          </div>
        ) : (
          <>
            {/* Donut */}
            <ResponsiveContainer width="100%" height={180}>
              <PieChart>
                <Pie
                  data={data}
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={2}
                  dataKey="value"
                  strokeWidth={0}
                >
                  {data.map((_, i) => (
                    <Cell key={i} fill={PALETTE[i % PALETTE.length]} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(value: number, name: string) => [
                    `${value} (${total ? ((value / total) * 100).toFixed(1) : 0}%)`,
                    name,
                  ]}
                  contentStyle={{
                    fontSize: 12,
                    borderRadius: 8,
                    backgroundColor: "var(--popover)",
                    border: "1px solid var(--border)",
                    color: "var(--popover-foreground)",
                    boxShadow: "var(--shadow-sm)",
                  }}
                  itemStyle={{ color: "var(--popover-foreground)" }}
                  labelStyle={{ color: "var(--popover-foreground)" }}
                />
              </PieChart>
            </ResponsiveContainer>

            {/* Legend */}
            <div className="mt-3 w-full space-y-1.5">
              {data.map((entry, i) => (
                <div key={i} className="flex items-center gap-2 text-xs">
                  <span
                    className="inline-block h-2 w-2 shrink-0 rounded-full"
                    style={{ background: PALETTE[i % PALETTE.length] }}
                  />
                  <span className="flex-1 truncate text-muted-foreground">{entry.name}</span>
                  <span className="tabular-nums font-semibold text-foreground">{entry.value}</span>
                  <span className="w-10 text-right tabular-nums text-muted-foreground/70">
                    {total ? ((entry.value / total) * 100).toFixed(0) : 0}%
                  </span>
                </div>
              ))}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────

export function DashboardAnalytics({ initialData }: { initialData: Channel[] }) {
  const searchParams = useSearchParams();
  const [data, setData] = React.useState<Channel[]>(initialData);
  const [isLoading, setIsLoading] = React.useState(false);

  React.useEffect(() => {
    const from = searchParams.get("from");
    const to = searchParams.get("to");

    if (from || to) {
      setIsLoading(true);
      fetchChannelsByDateRange(from ?? undefined, to ?? undefined)
        .then(setData)
        .catch(() => setData(initialData))
        .finally(() => setIsLoading(false));
    } else {
      setData(initialData);
    }
  }, [searchParams, initialData]);

  const genderData = React.useMemo(
    () => buildPieData(data.map((d) => normalizeGender(d.gender ?? ""))),
    [data],
  );

  const careerData = React.useMemo(
    () => buildPieData(data.map((d) => d.career ?? ""), 8),
    [data],
  );

  const hopeData = React.useMemo(
    () => buildPieData(data.map((d) => d.hope ?? ""), 8),
    [data],
  );

  return (
    <div
      className={`flex flex-col gap-6 transition-opacity duration-200 ${isLoading ? "pointer-events-none opacity-50" : ""
        }`}
    >
      {/* 3 donut charts — same row */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <DonutCard
          title="Phân bổ theo giới tính"
          description="Tỷ lệ Nam / Nữ trong tổng số đăng ký"
          data={genderData}
        />
        <DonutCard
          title="Phân bổ theo ngành nghề"
          description="Top ngành nghề của khách đăng ký"
          data={careerData}
        />
        <DonutCard
          title="Mong đợi tại Beauty Summit"
          description="Điều khách hàng kỳ vọng khi tham dự"
          data={hopeData}
        />
      </div>

      {/* Tier stats table */}
      <TierStatsTable data={data} />
    </div>
  );
}
