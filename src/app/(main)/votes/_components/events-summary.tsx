/* eslint-disable prettier/prettier */
"use client";

import { Trophy, Users } from "lucide-react";
import { Cell, Pie, PieChart } from "recharts";
import type { NameType, ValueType } from "recharts/types/component/DefaultTooltipContent";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart";
import type { VoteOptionRecord } from "@/lib/vote-options";

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
  const label = item.payload?.name ?? "";
  const displayValue = Array.isArray(value) ? value.join(", ") : String(value);
  return `${displayValue} ${label}`.trim();
}

function getProductLogo(name: string, voteOptions?: VoteOptionRecord[]) {
  if (!voteOptions) return null;
  const opt = voteOptions.find((o) => (o.product || "").trim().toLowerCase() === name.trim().toLowerCase());
  return opt?.logo || null;
}

function getAbsoluteImageUrl(url?: string | null): string {
  if (!url) return "";
  const t = url.trim();
  if (t.startsWith("http") || t.startsWith("data:")) return t;
  return t.startsWith("/") ? t : `/${t}`;
}

function TopRankItem({ item, rank, voteOptions }: { item: RatioItem; rank: number; voteOptions?: VoteOptionRecord[] }) {
  const logo = getProductLogo(item.name, voteOptions);
  const displayName = item.name === "?" ? "Chưa có" : item.name;
  const isImage = logo && (logo.startsWith("http") || logo.startsWith("/") || logo.startsWith("data:") || logo.startsWith("avatars/") || logo.startsWith("images/"));
  
  const isFirst = rank === 1;
  const sizeClass = isFirst ? "w-16 h-16 sm:w-20 sm:h-20" : "w-12 h-12 sm:w-16 sm:h-16";
  const ringColor = isFirst ? "ring-[#f5b700]" : rank === 2 ? "ring-[#cdd4e3]" : "ring-[#d97706]";
  const badgeColor = isFirst ? "bg-[#f5b700]" : rank === 2 ? "bg-[#cdd4e3]" : "bg-[#d97706]";
  const badgeText = rank === 2 ? "text-slate-800" : "text-white";
  
  const pillarHeight = rank === 1 ? "h-24 sm:h-32" : rank === 2 ? "h-20 sm:h-24" : "h-16 sm:h-20";
  const pillarBg = rank === 1 
    ? "bg-gradient-to-t from-[#f0c648]/40 to-[#f5b700]/80 border-[#f5b700]" 
    : rank === 2 
    ? "bg-gradient-to-t from-slate-200/40 to-[#cdd4e3]/80 border-[#cdd4e3]" 
    : "bg-gradient-to-t from-amber-700/40 to-[#d97706]/80 border-[#d97706]";

  return (
    <div className="flex flex-col items-center justify-end transition-transform hover:-translate-y-1">
      <div className="relative z-10 -mb-3 sm:-mb-4">
        <div className={`relative flex items-center justify-center overflow-hidden rounded-full ring-4 ${ringColor} bg-background ${sizeClass} shadow-xl`}>
          {isImage ? (
            <img src={getAbsoluteImageUrl(logo)} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-xl font-bold text-muted-foreground">{item.name.charAt(0)}</span>
          )}
        </div>
        <div className={`absolute -bottom-2 left-1/2 -translate-x-1/2 flex h-6 w-6 sm:h-7 sm:w-7 items-center justify-center rounded-full text-xs sm:text-sm font-black shadow-md border-2 border-background ${badgeColor} ${badgeText}`}>
          {rank}
        </div>
      </div>
      
      <div className={`w-[72px] sm:w-[90px] ${pillarHeight} ${pillarBg} border-t-[3px] rounded-t-xl shadow-inner flex flex-col items-center pt-5 sm:pt-6 px-1 pb-2`}>
        <span className={`text-[0.65rem] sm:text-[0.75rem] font-bold line-clamp-2 text-center leading-tight ${item.name === "?" ? "text-primary/50 italic" : "text-primary"}`} title={displayName}>
          {displayName}
        </span>
        <div className="mt-auto flex flex-col items-center">
          <span className="text-[0.95rem] sm:text-[1.1rem] font-black text-primary leading-none">{item.value > 0 ? item.value : 0}</span>
          <span className="text-[8px] sm:text-[9px] font-bold uppercase tracking-wider text-primary/80">vote</span>
        </div>
      </div>
    </div>
  );
}

export function EventsSummary({ totalVotes, genderData, brandRatioData, leaderboardData = [], voteOptions = [] }: EventsSummaryProps) {
  // Kết hợp voteOptions để đảm bảo luôn hiển thị kể cả khi 0 vote
  const fullLeaderboardMap = new Map(leaderboardData.map(item => [item.name, item.value]));
  
  if (voteOptions && voteOptions.length > 0) {
    voteOptions.forEach(opt => {
      const name = opt.product || opt.brandId || "Unknown";
      if (name && !fullLeaderboardMap.has(name)) {
        fullLeaderboardMap.set(name, 0);
      }
    });
  }
  
  const fullLeaderboardData = Array.from(fullLeaderboardMap.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);

  const defaultItem = { name: "?", value: 0 };
  const top1 = fullLeaderboardData[0] || defaultItem;
  const top2 = fullLeaderboardData[1] || defaultItem;
  const top3 = fullLeaderboardData[2] || defaultItem;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-4 gap-4">
      {/* Xếp hạng */}
      <Card className="p-1 lg:col-span-2 shadow-sm">
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-sm font-medium flex items-center gap-2">
            <Trophy className="w-4 h-4 text-amber-500" /> Bảng xếp hạng
          </CardTitle>
          <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" /> {totalVotes} lượt
          </div>
        </CardHeader>
        <CardContent className="flex flex-col sm:flex-row h-auto sm:h-[300px] overflow-hidden px-2 pb-0 p-0">
          {/* Top 3 Podium (Trái) */}
          <div className="flex h-full w-full flex-col justify-center border-b bg-gradient-to-b from-background to-muted/10 px-4 sm:w-1/2 sm:border-b-0 sm:border-r shadow-inner-sm">
            <div className="flex flex-row items-end justify-center gap-2 sm:gap-4 pb-0 sm:pb-4">
              <TopRankItem item={top2} rank={2} voteOptions={voteOptions} />
              <TopRankItem item={top1} rank={1} voteOptions={voteOptions} />
              <TopRankItem item={top3} rank={3} voteOptions={voteOptions} />
            </div>
          </div>
          {/* List rest (Phải) */}
          <div className="flex-1 bg-background p-3 space-y-3 overflow-y-auto custom-scrollbar pt-4 sm:pt-4 w-full sm:w-1/2 h-full">
            {fullLeaderboardData.map((item, i) => {
              const logo = getProductLogo(item.name, voteOptions);
              const isImg = logo && (logo.startsWith("http") || logo.startsWith("/") || logo.startsWith("data:") || logo.startsWith("avatars/") || logo.startsWith("images/"));
              const rank = i + 1;
              return (
                <div key={item.name} className="relative">
                  <div className="overflow-hidden rounded-[1.2rem] border border-border bg-card shadow-sm hover:shadow-md transition-shadow">
                    <div className="flex items-center gap-3 px-2.5 py-2.5">
                      <div className="flex w-6 shrink-0 justify-center font-black text-[1.1rem] text-muted-foreground">
                        {rank}
                      </div>
                      
                      {isImg ? (
                        <img src={getAbsoluteImageUrl(logo)} alt={item.name} className="h-[58px] w-[58px] shrink-0 rounded-[0.9rem] object-cover shadow-[0_6px_14px_rgba(0,0,0,0.1)]" />
                      ) : (
                        <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[0.9rem] bg-gradient-to-br from-indigo-500 to-purple-500 text-[1.2rem] font-black text-white shadow-[0_6px_14px_rgba(0,0,0,0.1)]">
                          {item.name !== "?" ? item.name.charAt(0) : "?"}
                        </div>
                      )}

                      <div className="min-w-0 flex-1">
                        <div className="mt-1 truncate text-[0.95rem] font-black text-card-foreground" title={item.name}>
                          {item.name === "?" ? "Chưa có" : item.name}
                        </div>
                        <div className="inline-flex max-w-full rounded bg-purple-100 dark:bg-purple-900/30 px-1.5 py-0.5 mt-0.5 text-[11px] font-semibold text-purple-700 dark:text-purple-400">
                          <span className="truncate">Thứ hạng {rank}</span>
                        </div>
                      </div>

                      <div className="flex shrink-0 flex-col items-end gap-2 pr-1">
                        <div className="flex items-baseline gap-1 text-right">
                          <span className="text-[0.95rem] font-bold text-foreground">{item.value}</span>
                          <span className="text-[11px] text-muted-foreground">vote</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
            {fullLeaderboardData.length === 0 && (
              <div className="text-center text-sm text-muted-foreground mt-8">
                Không có dữ liệu
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Pie Chart: Giới tính */}
      <Card className="p-1 shadow-sm">
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

      {/* Pie Chart: Thương hiệu / Sản phẩm */}
      <Card className="p-1 shadow-sm">
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
