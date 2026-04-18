"use client";

import * as React from "react";

import { Pie, PieChart, Label, Bar, BarChart, CartesianGrid, XAxis, YAxis, LabelList, Cell } from "recharts";

import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import type { ChartConfig } from "@/components/ui/chart";
import { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend } from "@/components/ui/chart";

type PieDatum = { source: string; revenue: number; fill: string };
type BranchBarRow = { name: string; actual: number; remaining: number };

const formatVNDCompact = (n: number) => {
  const v = Number(n) || 0;
  const abs = Math.abs(v);

  if (abs >= 1_000_000_000) {
    const x = v / 1_000_000_000;
    return `${x.toLocaleString("en-GB", { maximumFractionDigits: x >= 10 ? 0 : 1 })} tỷ`;
  }
  if (abs >= 1_000_000) {
    const x = v / 1_000_000;
    return `${x.toLocaleString("en-GB", { maximumFractionDigits: x >= 10 ? 0 : 1 })} triệu`;
  }
  return v.toLocaleString("en-GB");
};

export function InsightCards({
  revenueByChannel,
  revenueByBranchBars,
}: {
  revenueByChannel: { data: PieDatum[]; config: ChartConfig };
  revenueByBranchBars: { data: BranchBarRow[]; config: ChartConfig };
}) {
  const totalChannelRevenue = revenueByChannel.data.reduce((acc, curr) => acc + (curr.revenue || 0), 0);

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {/* Pie: Doanh thu theo kênh */}
      <Card className="flex flex-col p-1">
        <CardHeader>
          <CardTitle>Doanh thu theo kênh bán</CardTitle>
        </CardHeader>

        <CardContent className="flex-1 pb-4">
          <div className="flex items-center justify-between gap-4">
            <ChartContainer config={revenueByChannel.config} className="h-[280px] w-[280px] flex-shrink-0">
              <PieChart>
                <ChartTooltip
                  cursor={false}
                  content={<ChartTooltipContent hideLabel formatter={(v) => formatVNDCompact(Number(v))} />}
                />
                <Pie
                  data={revenueByChannel.data}
                  dataKey="revenue"
                  nameKey="source"
                  innerRadius={70}
                  outerRadius={100}
                  paddingAngle={2}
                  cornerRadius={4}
                >
                  <Label
                    content={({ viewBox }) => {
                      if (viewBox && "cx" in viewBox && "cy" in viewBox) {
                        return (
                          <text x={viewBox.cx} y={viewBox.cy} textAnchor="middle" dominantBaseline="middle">
                            <tspan
                              x={viewBox.cx}
                              y={viewBox.cy}
                              className="fill-foreground text-xl font-bold tabular-nums"
                            >
                              {formatVNDCompact(totalChannelRevenue)}
                            </tspan>
                            <tspan x={viewBox.cx} y={(viewBox.cy ?? 0) + 22} className="fill-muted-foreground text-xs">
                              Tổng doanh thu
                            </tspan>
                          </text>
                        );
                      }
                      return null;
                    }}
                  />
                </Pie>
              </PieChart>
            </ChartContainer>

            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              {revenueByChannel.data.map((item) => (
                <div key={item.source} className="flex items-center justify-between gap-2">
                  <div className="flex min-w-0 flex-1 items-center gap-2">
                    <span className="size-3 flex-shrink-0 rounded-full" style={{ background: item.fill }} />
                    <span className="text-muted-foreground truncate text-[11px]">
                      {(revenueByChannel.config as any)[item.source]?.label ?? item.source}
                    </span>
                  </div>
                  <span className="flex-shrink-0 text-[11px] font-medium tabular-nums">
                    {formatVNDCompact(item.revenue)}
                  </span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
        <CardFooter></CardFooter>
      </Card>

      {/* Bar ngang: Doanh thu theo chi nhánh */}
      <Card className="flex flex-col p-1">
        <CardHeader>
          <CardTitle>Doanh thu theo chi nhánh</CardTitle>
        </CardHeader>

        <CardContent className="flex-1 pb-4">
          <div className="mb-3 flex flex-wrap gap-2">
            {revenueByBranchBars.data.slice(0, 6).map((item, idx) => {
              const colorKey = `branch-${idx}`;
              const color = (revenueByBranchBars.config as any)[colorKey]?.color || `var(--chart-${(idx % 5) + 1})`;
              return (
                <div key={item.name} className="flex items-center gap-1.5">
                  <span className="size-2.5 rounded-full" style={{ background: color }} />
                  <span className="text-xs">{item.name}</span>
                </div>
              );
            })}
          </div>
          <ChartContainer config={revenueByBranchBars.config} className="h-[250px] w-full">
            <BarChart
              data={revenueByBranchBars.data}
              layout="vertical"
              margin={{ left: 0, right: 16, top: 5, bottom: 5 }}
            >
              <CartesianGrid horizontal={false} />
              <YAxis
                dataKey="name"
                type="category"
                tickLine={false}
                axisLine={false}
                width={100}
                tick={{ fontSize: 11 }}
              />
              <XAxis type="number" hide />
              <ChartTooltip
                cursor={false}
                content={<ChartTooltipContent formatter={(v) => formatVNDCompact(Number(v))} />}
              />

              <Bar dataKey="actual" radius={6}>
                {revenueByBranchBars.data.map((entry, index) => {
                  const colorKey = `branch-${index}`;
                  const color =
                    (revenueByBranchBars.config as any)[colorKey]?.color || `var(--chart-${(index % 5) + 1})`;
                  return <Cell key={`cell-${index}`} fill={color} />;
                })}
                <LabelList
                  dataKey="actual"
                  position="right"
                  formatter={(v: any) => formatVNDCompact(Number(v))}
                  style={{ fontSize: 10 }}
                />
              </Bar>
            </BarChart>
          </ChartContainer>
        </CardContent>

        <CardFooter></CardFooter>
      </Card>
    </div>
  );
}
