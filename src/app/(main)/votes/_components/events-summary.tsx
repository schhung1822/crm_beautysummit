/* eslint-disable prettier/prettier */
"use client";

import { Users } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";

type RatioItem = { name: string; value: number; fill: string };

type EventsSummaryProps = {
  totalVotes: number;
  genderData: RatioItem[];
  brandRatioData: RatioItem[];
};

function RatioLegend({ items }: { items: RatioItem[] }) {
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      {items.map((item) => (
        <div key={item.name} className="flex items-center gap-2">
          <span className="size-2.5 rounded-full" style={{ background: item.fill }} />
          <span className="text-muted-foreground text-xs">{item.name}</span>
        </div>
      ))}
    </div>
  );
}

function formatTooltip(value: ValueType, _name: NameType, item: { payload?: { name?: string } }) {
  const label = item.payload?.name ?? "";
  const displayValue = Array.isArray(value) ? value.join(", ") : String(value);
  return `${displayValue} ${label}`.trim();
}

export function EventsSummary({ totalVotes, genderData, brandRatioData }: EventsSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
      <div className="grid gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Lượt vote</CardTitle>
            <Users className="text-muted-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold tabular-nums">{totalVotes}</div>
            <p className="text-muted-foreground text-xs">Tổng lượt trong bảng</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Tỷ lệ theo giới tính</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ value: { label: "Tỷ lệ" } }} className="h-[220px] w-full">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={formatTooltip} />} />
              <Pie data={genderData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {genderData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <RatioLegend items={genderData} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium">Tỷ lệ theo thương hiệu</CardTitle>
        </CardHeader>
        <CardContent>
          <ChartContainer config={{ value: { label: "Tỷ lệ" } }} className="h-[220px] w-full">
            <PieChart>
              <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={formatTooltip} />} />
              <Pie data={brandRatioData} dataKey="value" nameKey="name" innerRadius={50} outerRadius={80} paddingAngle={2}>
                {brandRatioData.map((entry) => (
                  <Cell key={entry.name} fill={entry.fill} />
                ))}
              </Pie>
            </PieChart>
          </ChartContainer>
          <RatioLegend items={brandRatioData} />
        </CardContent>
      </Card>
    </div>
  );
}
