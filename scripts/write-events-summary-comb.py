import os
content='''import * as React from 'react';
import { Trophy, Medal, Award, Users } from 'lucide-react';
import { Cell, Pie, PieChart } from 'recharts';
import type { NameType, ValueType } from 'recharts/types/component/DefaultTooltipContent';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent } from '@/components/ui/card';
import type { VoteOptionRecord } from '@/lib/vote-options';

type RatioItem = { name: string; value: number; fill?: string };

type EventsSummaryProps = {
  totalVotes: number;
  genderData: RatioItem[];
  brandRatioData: RatioItem[];
  leaderboardData?: RatioItem[];
  voteOptions?: VoteOptionRecord[];
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
  const label = item.payload?.name ?? '';
  const displayValue = Array.isArray(value) ? value.join(', ') : String(value);
  return \\ \\.trim();
}

function getProductLogo(name: string, voteOptions?: VoteOptionRecord[]) {
  if (!voteOptions) return null;
  const opt = voteOptions.find(o => (o.product || '').trim().toLowerCase() === name.trim().toLowerCase());
  return opt?.logo || null;
}

function PodiumItem({ item, rank, voteOptions }: { item: RatioItem; rank: number; voteOptions?: VoteOptionRecord[] }) {
  const logo = getProductLogo(item.name, voteOptions);
  const sizeClass = rank === 1 ? 'w-20 h-20' : 'w-16 h-16';
  const ringColor = rank === 1 ? 'ring-amber-400' : rank === 2 ? 'ring-slate-300' : 'ring-amber-600';
  return (
    <div className="flex flex-col items-center gap-1 transform transition-transform hover:scale-105">
      <div className="relative mt-2">
        <div className={\elative rounded-full ring-4 ring-offset-2 \ \ overflow-hidden bg-muted flex items-center justify-center\}>
          {logo && logo.startsWith('http') ? <img src={logo} alt={item.name} className="w-full h-full object-cover" /> : <span className="text-xl font-bold">{item.name.charAt(0)}</span>}
        </div>
        <div className={\bsolute -bottom-3 left-1/2 -translate-x-1/2 w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white \ ring-2 ring-white shadow-sm\}>
          {rank}
        </div>
      </div>
      <div className="text-center mt-3">
        <div className="font-bold text-xs line-clamp-1 max-w-[80px]">{item.name}</div>
        <div className="text-[10px] text-muted-foreground font-medium">{item.value} vote</div>
      </div>
    </div>
  );
}

export function EventsSummary({ totalVotes, genderData, brandRatioData, leaderboardData = [], voteOptions = [] }: EventsSummaryProps) {
  const top1 = leaderboardData[0];
  const top2 = leaderboardData[1];
  const top3 = leaderboardData[2];
  const rest = leaderboardData.slice(3);

  return (
    <div className="flex flex-col xl:flex-row gap-4">
      {/* Xếp hạng */}
      <Card className="p-1 xl:w-1/2 shrink-0">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2"><Trophy className="w-4 h-4 text-primary" /> Bảng xếp hạng</CardTitle>
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1"><Users className="w-3 h-3"/> {totalVotes} lượt</div>
        </CardHeader>
        <CardContent className="flex flex-col lg:flex-row h-auto lg:h-[300px] overflow-hidden px-2 pb-0">
          {/* Top 3 Podium */}
          <div className="flex items-end justify-center gap-6 mt-2 shrink-0 border-b lg:border-b-0 lg:border-r pb-4 lg:pb-0 lg:pr-4 px-2">
            {top2 && <PodiumItem item={top2} rank={2} voteOptions={voteOptions} />}
            {top1 && <div className="relative -top-4"><PodiumItem item={top1} rank={1} voteOptions={voteOptions} /></div>}
            {top3 && <PodiumItem item={top3} rank={3} voteOptions={voteOptions} />}
          </div>
          {/* List rest */}
          <div className="flex-1 bg-muted/10 p-2 space-y-2 overflow-y-auto custom-scrollbar pt-4 lg:pt-2">
            {rest.map((item, i) => {
              const logo = getProductLogo(item.name, voteOptions);
              const rank = i + 4;
              return (
                <div key={item.name} className="flex items-center gap-3 p-2 rounded-lg border bg-card hover:bg-muted/50 transition-colors">
                  <div className="flex items-center justify-center w-6 font-bold text-sm text-muted-foreground">{rank}</div>
                  <div className="w-8 h-8 rounded-full overflow-hidden bg-muted flex items-center justify-center shrink-0">
                    {logo && logo.startsWith('http') ? <img src={logo} alt={item.name} className="w-full h-full object-cover" /> : <span className="font-bold text-xs">{item.name.charAt(0)}</span>}
                  </div>
                  <div className="flex-1 font-semibold text-sm line-clamp-1">{item.name}</div>
                  <div className="font-black text-sm text-primary">{item.value}</div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 flex-1">
        {/* Pie Chart: Giới tính */}
        <Card className="p-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tỷ lệ giới tính</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ value: { label: 'Tỷ lệ' } }} className="h-[200px] w-full">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={formatTooltip} />} />
                <Pie data={genderData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
                  {genderData.map((entry) => (
                    <Cell key={entry.name} fill={entry.fill} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>
            <RatioLegend items={genderData} />
          </CardContent>
        </Card>

        {/* Pie Chart: Thương hiệu / Sản phẩm */}
        <Card className="p-1">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Tỷ lệ thương hiệu</CardTitle>
          </CardHeader>
          <CardContent>
            <ChartContainer config={{ value: { label: 'Tỷ lệ' } }} className="h-[200px] w-full">
              <PieChart>
                <ChartTooltip cursor={false} content={<ChartTooltipContent hideLabel formatter={formatTooltip} />} />
                <Pie data={brandRatioData} dataKey="value" nameKey="name" innerRadius={40} outerRadius={70} paddingAngle={2}>
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
    </div>
  );
}'''
with open('d:/Projects/zaui-uni/crm_beautysummit/src/app/(main)/votes/_components/events-summary.tsx', 'w', encoding='utf-8') as f:
    f.write(content)