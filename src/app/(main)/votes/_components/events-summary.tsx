/* eslint-disable prettier/prettier */
"use client";

import { Trophy, Users } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { VoteOptionRecord } from "@/lib/vote-options";

type RankingItem = { name: string; value: number };
type CategoryRanking = { title: string; items: RankingItem[] };

type EventsSummaryProps = {
  categoryRankings?: CategoryRanking[];
  voteOptions?: VoteOptionRecord[];
};

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

function isImageUrl(value?: string | null): value is string {
  return Boolean(
    value &&
      (value.startsWith("http") ||
        value.startsWith("/") ||
        value.startsWith("data:") ||
        value.startsWith("avatars/") ||
        value.startsWith("images/")),
  );
}

function TopRankItem({ item, rank, voteOptions }: { item: RankingItem; rank: number; voteOptions?: VoteOptionRecord[] }) {
  const logo = getProductLogo(item.name, voteOptions);
  const displayName = item.name === "?" ? "Chưa có" : item.name;
  const isFirst = rank === 1;
  const sizeClass = isFirst ? "w-16 h-16 sm:w-20 sm:h-20" : "w-12 h-12 sm:w-16 sm:h-16";
  const ringColor = isFirst ? "ring-[#f5b700]" : rank === 2 ? "ring-[#cdd4e3]" : "ring-[#d97706]";
  const badgeColor = isFirst ? "bg-[#f5b700]" : rank === 2 ? "bg-[#cdd4e3]" : "bg-[#d97706]";
  const badgeText = rank === 2 ? "text-slate-800" : "text-white";
  const pillarHeight = rank === 1 ? "h-24 sm:h-32" : rank === 2 ? "h-20 sm:h-24" : "h-16 sm:h-20";
  const pillarBg =
    rank === 1
      ? "bg-gradient-to-t from-[#f0c648]/40 to-[#f5b700]/80 border-[#f5b700]"
      : rank === 2
        ? "bg-gradient-to-t from-slate-200/40 to-[#cdd4e3]/80 border-[#cdd4e3]"
        : "bg-gradient-to-t from-amber-700/40 to-[#d97706]/80 border-[#d97706]";

  return (
    <div className="flex flex-col items-center justify-end transition-transform hover:-translate-y-1">
      <div className="relative z-10 -mb-3 sm:-mb-4">
        <div
          className={`relative flex items-center justify-center overflow-hidden rounded-full ring-4 ${ringColor} bg-background ${sizeClass} shadow-xl`}
        >
          {isImageUrl(logo) ? (
            <img src={getAbsoluteImageUrl(logo)} alt={displayName} className="h-full w-full object-cover" />
          ) : (
            <span className="text-muted-foreground text-xl font-bold">{item.name.charAt(0)}</span>
          )}
        </div>
        <div
          className={`absolute -bottom-2 left-1/2 flex h-6 w-6 -translate-x-1/2 items-center justify-center rounded-full border-2 border-background text-xs font-black shadow-md sm:h-7 sm:w-7 sm:text-sm ${badgeColor} ${badgeText}`}
        >
          {rank}
        </div>
      </div>

      <div
        className={`flex w-[72px] flex-col items-center rounded-t-xl border-t-[3px] px-1 pt-5 pb-2 shadow-inner sm:w-[90px] sm:pt-6 ${pillarHeight} ${pillarBg}`}
      >
        <span
          className={`line-clamp-2 text-center text-[0.65rem] leading-tight font-bold sm:text-[0.75rem] ${
            item.name === "?" ? "text-primary/50 italic" : "text-white"
          }`}
          title={displayName}
        >
          {displayName}
        </span>
        <div className="mt-auto flex flex-col items-center">
          <span className="text-[0.95rem] leading-none font-black text-white sm:text-[1.1rem]">{item.value}</span>
          <span className="text-[8px] font-bold tracking-wider text-white/80 uppercase sm:text-[9px]">vote</span>
        </div>
      </div>
    </div>
  );
}

function RankingReport({
  title,
  items,
  voteOptions,
}: {
  title: string;
  items: RankingItem[];
  voteOptions?: VoteOptionRecord[];
}) {
  const defaultItem = { name: "?", value: 0 };
  const top1 = items[0] || defaultItem;
  const top2 = items[1] || defaultItem;
  const top3 = items[2] || defaultItem;
  const restItems = items.slice(3);
  const totalVotes = items.reduce((sum, item) => sum + item.value, 0);

  return (
    <Card className="p-1 shadow-sm">
      <CardHeader className="flex flex-row items-center justify-between pt-2">
        <CardTitle className="flex items-center gap-2 text-sm font-medium">
          <Trophy className="h-4 w-4 text-amber-500" /> {title}
        </CardTitle>
        <div className="text-muted-foreground flex items-center gap-1 text-xs font-medium">
          <Users className="h-3 w-3" /> {totalVotes} lượt
        </div>
      </CardHeader>
      <CardContent className="flex h-auto flex-col overflow-hidden px-2 p-0 pb-0 sm:h-[300px] sm:flex-row">
        <div className="flex h-full w-full flex-col justify-center border-b bg-gradient-to-b from-background to-muted/10 px-4 shadow-inner-sm sm:w-1/2 sm:border-r sm:border-b-0">
          <div className="flex flex-row items-end justify-center gap-2 pb-0 sm:gap-4 sm:pb-4">
            <TopRankItem item={top2} rank={2} voteOptions={voteOptions} />
            <TopRankItem item={top1} rank={1} voteOptions={voteOptions} />
            <TopRankItem item={top3} rank={3} voteOptions={voteOptions} />
          </div>
        </div>
        <div className="nice-scroll flex-1 space-y-3 overflow-y-auto bg-background p-3 pt-4 sm:h-full sm:w-1/2">
          {restItems.map((item, index) => {
            const logo = getProductLogo(item.name, voteOptions);
            const rank = index + 4;
            return (
              <div key={item.name} className="overflow-hidden rounded-[12px] border border-border bg-card shadow-sm transition-shadow hover:shadow-md">
                <div className="flex items-center gap-3 px-2.5 py-2.5">
                  <div className="text-muted-foreground flex w-6 shrink-0 justify-center text-[1.1rem] font-black">
                    {rank}
                  </div>
                  {isImageUrl(logo) ? (
                    <img
                      src={getAbsoluteImageUrl(logo)}
                      alt={item.name}
                      className="h-[58px] w-[58px] shrink-0 rounded-[8px] object-cover shadow-[0_6px_14px_rgba(0,0,0,0.1)]"
                    />
                  ) : (
                    <div className="flex h-[58px] w-[58px] shrink-0 items-center justify-center rounded-[0.9rem] bg-gradient-to-br from-indigo-500 to-purple-500 text-[1.2rem] font-black text-white shadow-[0_6px_14px_rgba(0,0,0,0.1)]">
                      {item.name.charAt(0)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="mt-1 truncate text-[0.95rem] font-bold text-card-foreground" title={item.name}>
                      {item.name}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-2 pr-1">
                    <div className="flex items-baseline gap-1 text-right">
                      <span className="text-[0.95rem] font-bold text-foreground">{item.value}</span>
                      <span className="text-muted-foreground text-[11px]">vote</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {items.length === 0 ? (
            <div className="text-muted-foreground mt-8 text-center text-sm">Không có dữ liệu</div>
          ) : null}
          {items.length > 0 && restItems.length === 0 ? (
            <div className="text-muted-foreground mt-8 text-center text-sm">Top 3 đang hiển thị ở bục xếp hạng</div>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}

export function EventsSummary({ categoryRankings = [], voteOptions = [] }: EventsSummaryProps) {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
      {categoryRankings.map((ranking) => (
        <RankingReport
          key={ranking.title}
          title={`Xếp hạng theo ${ranking.title.toLowerCase()}`}
          items={ranking.items}
          voteOptions={voteOptions}
        />
      ))}
    </div>
  );
}
