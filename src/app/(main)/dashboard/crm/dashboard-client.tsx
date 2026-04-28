"use client";

import { useEffect, useState } from "react";

import { BarChart3, Building2, Crown, Medal } from "lucide-react";
import { useRouter } from "next/navigation";
import {
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

import { DatePicker } from "@/components/ui/date-picker";

const C = {
  navy: "#1E1656",
  dark: "var(--background)",
  pink: "#F0588C",
  gold: "#B8860B",
  goldLight: "#FFD700",
  cyan: "#5BC8D8",
  purple: "#9B7DB8",
  green: "#22C55E",
  red: "#EF4444",
  orange: "#F97316",
};

const panelClass = "rounded-xl border bg-card p-5 text-card-foreground shadow-sm";
const metricClass = "text-2xl font-semibold leading-none tabular-nums";
const chartTick = { fill: "var(--muted-foreground)", fontSize: 10 };
const subtleGrid = "var(--border)";
const chartTooltipStyle = {
  backgroundColor: "var(--popover)",
  border: "1px solid var(--border)",
  borderRadius: "var(--radius)",
  color: "var(--popover-foreground)",
  boxShadow: "var(--shadow-sm)",
};
const chartTooltipLabelStyle = { color: "var(--popover-foreground)" };

const textColorClass: Record<string, string> = {
  [C.pink]: "text-pink-600 dark:text-pink-400",
  [C.gold]: "text-amber-700 dark:text-amber-400",
  [C.goldLight]: "text-amber-500 dark:text-amber-300",
  [C.cyan]: "text-cyan-600 dark:text-cyan-400",
  [C.purple]: "text-violet-600 dark:text-violet-400",
  [C.green]: "text-emerald-600 dark:text-emerald-400",
  [C.red]: "text-destructive",
  [C.orange]: "text-orange-600 dark:text-orange-400",
};

const bgColorClass: Record<string, string> = {
  [C.pink]: "bg-pink-500",
  [C.gold]: "bg-amber-600",
  [C.goldLight]: "bg-amber-400",
  [C.cyan]: "bg-cyan-500",
  [C.purple]: "bg-violet-500",
  [C.green]: "bg-emerald-500",
  [C.red]: "bg-destructive",
  [C.orange]: "bg-orange-500",
  "#6366F1": "bg-indigo-500",
  "#10B981": "bg-emerald-500",
  "#F59E0B": "bg-amber-500",
};

const getTextColor = (color?: string) => textColorClass[color ?? ""] ?? "text-inherit";
const getBgColor = (color?: string) => bgColorClass[color ?? ""] ?? "bg-muted-foreground";
const getPctWidthClass = (pct: number) => {
  if (pct >= 95) return "w-full";
  if (pct >= 90) return "w-[90%]";
  if (pct >= 80) return "w-4/5";
  if (pct >= 75) return "w-3/4";
  if (pct >= 66) return "w-2/3";
  if (pct >= 60) return "w-3/5";
  if (pct >= 50) return "w-1/2";
  if (pct >= 40) return "w-2/5";
  if (pct >= 33) return "w-1/3";
  if (pct >= 25) return "w-1/4";
  if (pct >= 20) return "w-1/5";
  if (pct > 0) return "w-[12%]";
  return "w-0";
};

const FUNNEL_COLORS = [C.green, C.pink, C.goldLight, C.cyan, C.purple, C.orange, C.red, C.gold];

const DEFAULT_HOURLY = [{ time: "00:00", checkin: 0, active: 0 }];
const DEFAULT_ZONES = [{ name: "Chưa có dữ liệu", count: 0, pct: 0, color: C.gold }];
const DEFAULT_MISSION_PHASES = [
  { phase: "Trước SK", total: 0, completed: 0, avg: 0 },
  { phase: "Ngày 1", total: 0, completed: 0, avg: 0 },
  { phase: "Ngày 2", total: 0, completed: 0, avg: 0 },
];
const DEFAULT_TOP_VOTES: Array<{ name: string; votes: number; cat: string; logo?: string; productImage?: string }> = [];
const DEFAULT_DAILY_REG = [{ date: "--/--", reg: 0 }];
const DEFAULT_NOTIFY_STATS = [
  { round: "Lần 1 - Nhắc lịch", sent: 0, converted: 0, cvr: 0 },
  { round: "Lần 2 - Early bird", sent: 0, converted: 0, cvr: 0 },
  { round: "Lần 3 - Countdown", sent: 0, converted: 0, cvr: 0 },
  { round: "Lần 4 - Cuối cùng", sent: 0, converted: 0, cvr: 0 },
];
const DEFAULT_PAYMENT_BY_TIER = [
  { tier: "VIP", new: 0, paydone: 0 },
  { tier: "GOLD", new: 0, paydone: 0 },
  { tier: "RUBY", new: 0, paydone: 0 },
];
const DEFAULT_LABEL_STATS: Array<{ label: string; count: number }> = [{ label: "Chưa có dữ liệu", count: 0 }];

const truncateLabel = (value: string, max = 32) => (value.length > max ? `${value.slice(0, max - 1)}…` : value);

type BrandDashboard = {
  id: string;
  name: string;
  brandId?: string;
  category?: string;
  logo?: string;
  productImage?: string;
  votes: number;
  rank: number;
  profileView: number;
  boothVisit: number;
  voucherIssued: number;
  voucherClaimed: number;
  claimRate: number;
  missionComplete: number;
  hourly: Array<{ time: string; booth: number }>;
  voteTrend: Array<{ day: string; v: number }>;
};

const EMPTY_BRAND_DASHBOARD: BrandDashboard = {
  id: "",
  name: "Chưa có dữ liệu",
  votes: 0,
  rank: 0,
  profileView: 0,
  boothVisit: 0,
  voucherIssued: 0,
  voucherClaimed: 0,
  claimRate: 0,
  missionComplete: 0,
  hourly: Array.from({ length: 24 }, (_, hour) => ({ time: `${String(hour).padStart(2, "0")}:00`, booth: 0 })),
  voteTrend: [
    { day: "Trước SK", v: 0 },
    { day: "Ngày 1 AM", v: 0 },
    { day: "Ngày 1 PM", v: 0 },
    { day: "Ngày 2 AM", v: 0 },
    { day: "Ngày 2 PM", v: 0 },
    { day: "Sau SK", v: 0 },
  ],
};

const StatCard = ({ label, value, sub, color = C.goldLight }: any) => (
  <div className={`${panelClass} min-w-[140px] flex-1 px-[18px] py-5`}>
    <div className="text-muted-foreground mb-[6px] text-[11px] font-medium">{label}</div>
    <div className={`${metricClass} ${getTextColor(color)}`}>
      {typeof value === "number" ? value.toLocaleString() : value}
    </div>
    {sub && <div className="text-muted-foreground mt-1 text-[10px]">{sub}</div>}
  </div>
);

const SectionTitle = ({ children, color = C.goldLight }: any) => (
  <div className="text-foreground mb-4 flex items-center gap-2 text-base font-bold">
    <div className={`h-5 w-1 rounded-[2px] ${getBgColor(color)}`} />
    {children}
  </div>
);

const buildFunnelRows = (stats: any) => {
  const totalOrders = Math.max(stats.totalOrders ?? 0, 1);

  return [
    { stage: "Nguồn Fb", value: stats.sourceFb ?? 0 },
    { stage: "Nguồn Zalo", value: stats.sourceZalo ?? 0 },
    { stage: "Nguồn Website", value: stats.sourceWeb ?? 0 },
    { stage: "Check-in", value: stats.checkedIn ?? 0 },
    { stage: "Làm nhiệm vụ", value: stats.missionActive ?? 0 },
    { stage: "Đổi voucher", value: stats.voucherClaimed ?? 0 },
    { stage: "100% nhiệm vụ", value: stats.vf3Eligible ?? 0 },
    { stage: "Bình chọn", value: stats.voted ?? 0 },
  ]
    .sort((left, right) => right.value - left.value)
    .map((item, index) => ({
      ...item,
      color: FUNNEL_COLORS[index % FUNNEL_COLORS.length],
      colorClass: getBgColor(FUNNEL_COLORS[index % FUNNEL_COLORS.length]),
      textClass: getTextColor(FUNNEL_COLORS[index % FUNNEL_COLORS.length]),
      pct: Math.round((item.value / totalOrders) * 100),
    }));
};

const buildConversionFunnelRows = (stats: any) => {
  const totalOrders = Number(stats.totalOrders ?? stats.registered ?? 0);
  const paid = Number(stats.paid ?? 0);
  const checkedIn = Number(stats.checkedIn ?? 0);

  return [
    {
      stage: "Tổng đơn",
      value: totalOrders,
      pct: 100,
      colorClass: "bg-indigo-500",
      shapeClass: "h-[86px] w-[96%] min-w-60",
    },
    {
      stage: "Đã thanh toán",
      value: paid,
      pct: totalOrders > 0 ? Math.round((paid / totalOrders) * 1000) / 10 : 0,
      colorClass: "bg-emerald-500",
      shapeClass: "h-[86px] w-[96%] min-w-60 [clip-path:polygon(0_0,100%_0,78%_100%,22%_100%)]",
    },
    {
      stage: "Đã check-in",
      value: checkedIn,
      pct: paid > 0 ? Math.round((checkedIn / paid) * 1000) / 10 : 0,
      colorClass: "bg-amber-500",
      shapeClass: "h-[84px] w-[54%] min-w-36 [clip-path:polygon(0_0,100%_0,72%_100%,28%_100%)]",
    },
  ];
};

const isImageUrl = (value?: string): boolean =>
  /^(data:image\/|https?:\/\/|\/?(avatars|images|public)\/|\/)/i.test(String(value ?? "").trim());

const getVoteImageUrl = (value?: string) => {
  const trimmed = String(value ?? "").trim();
  if (!trimmed || !isImageUrl(trimmed)) return "";
  if (/^(https?:\/\/|data:image\/|\/)/i.test(trimmed)) return trimmed;
  return `/${trimmed}`;
};

const buildVoteFallback = (value: string) =>
  value
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join("");

const buildTopVoteRows = (rows: any[]) => {
  const safeRows = Array.isArray(rows) ? rows : [];
  return Array.from({ length: 10 }, (_, index) => {
    return safeRows[index] ?? { name: "Chưa có dữ liệu", votes: 0, cat: "", logo: "", productImage: "", empty: true };
  });
};

export default function DashboardClient({ events }: { events: any }) {
  const router = useRouter();
  const EVENT_STATS = events;
  const brandDashboards: BrandDashboard[] = Array.isArray(EVENT_STATS.brandDashboards)
    ? EVENT_STATS.brandDashboards
    : [];
  const [view, setView] = useState("leadership");
  const [selectedBrand, setSelectedBrand] = useState(() => brandDashboards[0]?.id ?? "");
  const bd = brandDashboards.find((brand) => brand.id === selectedBrand) ?? brandDashboards[0] ?? EMPTY_BRAND_DASHBOARD;
  const mappedFunnel = buildFunnelRows(EVENT_STATS);
  const conversionFunnel = buildConversionFunnelRows(EVENT_STATS);
  const hourlyStats =
    Array.isArray(EVENT_STATS.hourlyStats) && EVENT_STATS.hourlyStats.length > 0
      ? EVENT_STATS.hourlyStats
      : DEFAULT_HOURLY;
  const hourlyDate = String(EVENT_STATS.hourlyDate ?? "");
  const eventDay1 = String(EVENT_STATS.eventDay1 ?? "");
  const checkinZones =
    Array.isArray(EVENT_STATS.checkinZones) && EVENT_STATS.checkinZones.length > 0
      ? EVENT_STATS.checkinZones
      : DEFAULT_ZONES;
  const missionPhases =
    Array.isArray(EVENT_STATS.missionPhases) && EVENT_STATS.missionPhases.length > 0
      ? EVENT_STATS.missionPhases
      : DEFAULT_MISSION_PHASES;
  const topVotes = buildTopVoteRows(Array.isArray(EVENT_STATS.topVotes) ? EVENT_STATS.topVotes : DEFAULT_TOP_VOTES);
  const dailyRegistrations =
    Array.isArray(EVENT_STATS.dailyRegistrations) && EVENT_STATS.dailyRegistrations.length > 0
      ? EVENT_STATS.dailyRegistrations
      : DEFAULT_DAILY_REG;
  const notifyStats =
    Array.isArray(EVENT_STATS.notifyStats) && EVENT_STATS.notifyStats.length > 0
      ? EVENT_STATS.notifyStats
      : DEFAULT_NOTIFY_STATS;
  const paymentByTier =
    Array.isArray(EVENT_STATS.paymentByTier) && EVENT_STATS.paymentByTier.length > 0
      ? EVENT_STATS.paymentByTier
      : DEFAULT_PAYMENT_BY_TIER;
  const careerStats =
    Array.isArray(EVENT_STATS.careerStats) && EVENT_STATS.careerStats.length > 0
      ? EVENT_STATS.careerStats
      : DEFAULT_LABEL_STATS;
  const hopeStats =
    Array.isArray(EVENT_STATS.hopeStats) && EVENT_STATS.hopeStats.length > 0
      ? EVENT_STATS.hopeStats
      : DEFAULT_LABEL_STATS;

  const handleHourlyDateChange = (nextDate: string) => {
    const params = new URLSearchParams(window.location.search);
    if (nextDate) {
      params.set("date", nextDate);
    } else {
      params.delete("date");
    }
    const query = params.toString();
    window.location.href = `${window.location.pathname}${query ? `?${query}` : ""}`;
  };
  const handleEventDay1Change = async (nextDate: string) => {
    if (!nextDate) return;
    await fetch("/api/event-settings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ eventDay1: nextDate }),
    });
    window.location.reload();
  };

  useEffect(() => {
    const refreshInterval = window.setInterval(() => {
      router.refresh();
    }, 30_000);

    return () => window.clearInterval(refreshInterval);
  }, [router]);

  return (
    <div className="w-full max-w-none bg-transparent pb-10">
      {/* HEADER */}
      <div className="flex flex-wrap items-center justify-between gap-3 border-b px-0 pt-3 pb-5">
        <div>
          <div className="text-primary mb-1 text-[10px] font-semibold tracking-[0.28em] uppercase">BEAUTYVERSE</div>
          <div className="text-foreground text-xl font-semibold">Dashboard</div>
        </div>
        <div className="flex gap-1.5">
          {[
            { key: "leadership", label: "Ban Lãnh Đạo", Icon: BarChart3 },
            { key: "brand", label: "Nhãn Hàng", Icon: Building2 },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setView(t.key)}
              className={`inline-flex cursor-pointer items-center gap-2 rounded-lg border px-5 py-2.5 text-[13px] font-medium transition-colors ${
                view === t.key
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-border bg-muted/50 text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              }`}
            >
              <t.Icon className="size-4" />
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="pt-6">
        {view === "leadership" && (
          <div className="flex flex-col gap-6">
            {/* Top stats */}
            <div className="flex flex-wrap items-start gap-3">
              <StatCard label="Đăng ký" value={EVENT_STATS.registered} color={C.cyan} />
              <StatCard label="Đã thanh toán" value={EVENT_STATS.paid} color={C.green} />
              <StatCard label="Chưa TT" value={EVENT_STATS.unpaid} color={C.red} />
              <StatCard label="Check-in" value={EVENT_STATS.checkedIn} color={C.pink} />
              <StatCard label="Đổi voucher" value={EVENT_STATS.voucherClaimed} color={C.goldLight} />
              <StatCard label="Bình chọn" value={EVENT_STATS.voted} color={C.orange} />
              <StatCard label="Đủ ĐK VF3" value={EVENT_STATS.vf3Eligible} color={C.purple} />
            </div>

            {/* Funnel + Hourly */}
            <div className="grid grid-cols-1 gap-[20px] md:grid-cols-[0.85fr_1.35fr]">
              <div className={panelClass}>
                <SectionTitle>Funnel chuyển đổi</SectionTitle>
                <div className="flex flex-col gap-2">
                  {mappedFunnel.map((f, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <div className="text-muted-foreground w-20 shrink-0 text-right text-[11px]">{f.stage}</div>
                      <div className="bg-muted relative h-6 flex-1 overflow-hidden rounded-md">
                        <div
                          className={`h-full rounded-md transition-[width] duration-1000 ${f.colorClass} ${getPctWidthClass(f.pct)}`}
                        />
                        <span className="absolute top-1 right-2 text-[10px] font-bold text-white">
                          {f.value.toLocaleString()}
                        </span>
                      </div>
                      <div className={`w-10 text-[11px] font-bold ${f.textClass}`}>{f.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={panelClass}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <SectionTitle color={C.cyan}>Check-in & Active theo giờ</SectionTitle>
                  <DatePicker value={hourlyDate} onChange={handleHourlyDateChange} className="w-[190px]" />
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyStats}>
                      <defs>
                        <linearGradient id="gCI" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.gold} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={C.gold} stopOpacity={0} />
                        </linearGradient>
                        <linearGradient id="gAct" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.cyan} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={C.cyan} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={subtleGrid} />
                      <XAxis dataKey="time" tick={chartTick} />
                      <YAxis tick={chartTick} />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} />
                      <Area type="monotone" dataKey="checkin" stroke={C.gold} fill="url(#gCI)" name="Check-in" />
                      <Area type="monotone" dataKey="active" stroke={C.cyan} fill="url(#gAct)" name="Active user" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Zone + Missions */}
            <div className="grid grid-cols-1 gap-[20px] lg:grid-cols-3">
              <div className={panelClass}>
                <SectionTitle color={C.pink}>Check-in theo khu vực</SectionTitle>
                <div className="max-h-[300px] overflow-y-auto pr-1.5">
                  {checkinZones.map((z: any, i: number) => (
                    <div key={z.id ?? i} className="mb-3.5">
                      <div className="mb-1 flex justify-between">
                        <span className="text-foreground text-[13px] font-semibold">{z.name}</span>
                        <span className={`text-[13px] font-bold ${getTextColor(z.color)}`}>
                          {z.count.toLocaleString()}
                        </span>
                      </div>
                      <div className="bg-muted h-2 overflow-hidden rounded">
                        <div className={`h-full rounded ${getBgColor(z.color)} ${getPctWidthClass(z.pct)}`} />
                      </div>
                      <div className="text-muted-foreground mt-0.5 text-[10px]">{z.pct}% tổng check-in</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={panelClass}>
                <SectionTitle>Phễu chuyển đổi</SectionTitle>
                <div className="flex flex-col items-center gap-0.5 px-1 pb-3">
                  {conversionFunnel.map((f, i) => (
                    <div
                      key={f.stage}
                      className={`flex h-fit flex-col items-center justify-center py-2 text-center text-white ${f.colorClass} ${f.shapeClass}`}
                    >
                      <div className="text-base font-bold">{f.stage}</div>
                      <div className="mt-0.5 text-[12px]">
                        {f.value.toLocaleString()} - {f.pct}%
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className={panelClass}>
                <SectionTitle color={C.green}>Nhiệm vụ theo giai đoạn</SectionTitle>
                {missionPhases.map((m: any, i: number) => (
                  <div key={i} className="bg-muted/40 mb-4 rounded-lg border p-3.5">
                    <div className="mb-1 flex justify-between">
                      <span className="text-foreground text-[13px] font-bold">{m.phase}</span>
                      <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                        {m.avg}% trung bình
                      </span>
                    </div>
                    <div className="text-muted-foreground text-[11px]">
                      {m.total} nhiệm vụ · {m.completed.toLocaleString()}
                      {Number(m.possible ?? 0) > 0 ? `/${Number(m.possible).toLocaleString()}` : ""} lượt hoàn thành
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top brands + Notify */}
            <div className="grid grid-cols-1 gap-[20px] md:grid-cols-2">
              <div className={panelClass}>
                <SectionTitle color={C.purple}>Top 10 bình chọn</SectionTitle>
                <div className="flex max-h-[360px] flex-col gap-2 overflow-y-auto pr-1.5">
                  {(() => {
                    const maxVotes = Math.max(1, ...topVotes.map((row: any) => Number(row.votes ?? 0)));
                    const podium = [
                      {
                        row: "bg-gradient-to-r from-amber-50 via-yellow-50/40 to-transparent dark:from-amber-950/40 dark:via-amber-950/10 dark:to-transparent",
                        border: "border-amber-300/70 dark:border-amber-700/50",
                        badge: "bg-gradient-to-br from-[#FFD700] to-[#B8860B] shadow-[0_4px_14px_rgba(255,215,0,0.45)]",
                        bar: "bg-gradient-to-r from-[#FFD700] to-[#B8860B]",
                        accent: "text-amber-700 dark:text-amber-400",
                        Icon: Crown,
                      },
                      {
                        row: "bg-gradient-to-r from-slate-100 via-slate-50/40 to-transparent dark:from-slate-700/40 dark:via-slate-800/10 dark:to-transparent",
                        border: "border-border",
                        badge:
                          "bg-gradient-to-br from-slate-300 to-slate-500 shadow-[0_4px_14px_rgba(148,163,184,0.4)]",
                        bar: "bg-gradient-to-r from-slate-300 to-slate-500",
                        accent: "text-muted-foreground",
                        Icon: Medal,
                      },
                      {
                        row: "bg-gradient-to-r from-orange-50 via-amber-50/40 to-transparent dark:from-orange-950/40 dark:via-amber-950/10 dark:to-transparent",
                        border: "border-orange-300/70 dark:border-orange-800/50",
                        badge: "bg-gradient-to-br from-[#d97706] to-[#7c2d12] shadow-[0_4px_14px_rgba(217,119,6,0.4)]",
                        bar: "bg-gradient-to-r from-[#d97706] to-[#7c2d12]",
                        accent: "text-orange-700 dark:text-orange-400",
                        Icon: Medal,
                      },
                    ];

                    return topVotes.map((b: any, i: number) => {
                      const title = b.name || "Chưa có dữ liệu";
                      const imageUrl = getVoteImageUrl(b.logo || b.productImage);
                      const isEmpty = Boolean(b.empty);
                      const votes = Number(b.votes ?? 0);
                      const pct = Math.round((votes / maxVotes) * 100);
                      const isPodium = i < 3 && !isEmpty;
                      const style = isPodium ? podium[i] : null;
                      const PodiumIcon = style?.Icon;

                      return (
                        <div
                          key={i}
                          className={`group relative flex shrink-0 items-center gap-3 overflow-hidden rounded-xl border px-3 py-2.5 transition-all hover:-translate-y-px hover:shadow-md ${
                            isPodium
                              ? `${style!.row} ${style!.border}`
                              : "border-border bg-card hover:border-primary/50"
                          } ${isEmpty ? "opacity-50" : ""}`}
                        >
                          <div
                            className={`relative flex h-9 w-9 shrink-0 items-center justify-center rounded-xl text-[13px] font-black tabular-nums ${
                              isPodium ? `${style!.badge} text-white` : "bg-muted text-muted-foreground"
                            }`}
                          >
                            {isPodium && PodiumIcon ? (
                              <>
                                <PodiumIcon className="absolute -top-2 left-1/2 size-3.5 -translate-x-1/2 fill-white text-white drop-shadow" />
                                {i + 1}
                              </>
                            ) : (
                              i + 1
                            )}
                          </div>

                          {imageUrl ? (
                            <img
                              src={imageUrl}
                              alt={title}
                              className={`h-11 w-11 shrink-0 rounded-xl bg-white object-cover ring-1 ${
                                isPodium ? "ring-background shadow-md" : "ring-border"
                              }`}
                            />
                          ) : (
                            <div className="bg-primary text-primary-foreground ring-border flex h-11 w-11 shrink-0 items-center justify-center rounded-xl text-[13px] font-black shadow-sm ring-1">
                              {buildVoteFallback(title) || "VT"}
                            </div>
                          )}

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2">
                              <div
                                className={`truncate text-[13.5px] font-bold ${isPodium ? "text-foreground" : "text-foreground"}`}
                              >
                                {title}
                              </div>
                              {b.cat ? (
                                <span className="bg-primary/10 text-primary hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-semibold sm:inline-block">
                                  {b.cat}
                                </span>
                              ) : null}
                            </div>
                            <div className="bg-muted mt-1.5 h-1.5 overflow-hidden rounded-full">
                              <div
                                className={`h-full rounded-full ${
                                  isPodium ? style!.bar : "bg-primary"
                                } ${getPctWidthClass(pct)}`}
                              />
                            </div>
                          </div>

                          <div className="flex shrink-0 flex-col items-end leading-none">
                            <span
                              className={`text-[18px] font-semibold tabular-nums ${
                                isPodium ? style!.accent : "text-foreground"
                              }`}
                            >
                              {votes.toLocaleString()}
                            </span>
                            <span className="text-muted-foreground mt-0.5 text-[9px] font-semibold tracking-[0.1em] uppercase">
                              vote
                            </span>
                          </div>
                        </div>
                      );
                    });
                  })()}
                </div>
              </div>

              <div className={panelClass}>
                <SectionTitle color={C.orange}>Hiệu quả Notify (trước SK)</SectionTitle>
                <div className="flex flex-col gap-2">
                  {notifyStats.map((n: any, i: number) => (
                    <div key={i} className="bg-muted/40 rounded-lg border p-3">
                      <div className="text-foreground mb-1.5 text-xs font-semibold">{n.round}</div>
                      <div className="grid grid-cols-3 gap-3">
                        <div>
                          <span className="text-muted-foreground text-[10px]">Gửi </span>
                          <span className={`text-[13px] font-bold ${getTextColor(C.cyan)}`}>
                            {Number(n.sent ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px]">Convert </span>
                          <span className={`text-[13px] font-bold ${getTextColor(C.green)}`}>
                            {Number(n.converted ?? 0).toLocaleString()}
                          </span>
                        </div>
                        <div>
                          <span className="text-muted-foreground text-[10px]">CVR </span>
                          <span className={`text-[13px] font-bold ${getTextColor(C.pink)}`}>{Number(n.cvr ?? 0)}%</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-3 rounded-lg border border-emerald-500/20 bg-emerald-500/10 p-2.5">
                  <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                    Tổng convert từ 4 lần notify:{" "}
                    {notifyStats.reduce((a: number, n: any) => a + Number(n.converted ?? 0), 0).toLocaleString()} đăng
                    ký
                  </span>
                </div>
              </div>
            </div>

            {/* Registration trend */}
            <div className={panelClass}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <SectionTitle>Lượng đăng ký 7 ngày trước sự kiện</SectionTitle>
                <DatePicker value={eventDay1} onChange={handleEventDay1Change} className="w-[190px]" />
              </div>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyRegistrations}>
                    <CartesianGrid strokeDasharray="3 3" stroke={subtleGrid} />
                    <XAxis dataKey="date" tick={chartTick} />
                    <YAxis tick={chartTick} />
                    <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} />
                    <Bar dataKey="reg" fill={C.gold} radius={[4, 4, 0, 0]} name="Đăng ký" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Payment status by ticket tier */}
            <div className={panelClass}>
              <SectionTitle color={C.green}>Trạng thái thanh toán theo hạng vé</SectionTitle>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={paymentByTier} margin={{ top: 8, right: 16, bottom: 4, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke={subtleGrid} />
                    <XAxis dataKey="tier" tick={{ fill: "var(--muted-foreground)", fontSize: 14, fontWeight: 600 }} />
                    <YAxis
                      tick={{ fill: "var(--muted-foreground)", fontSize: 13 }}
                      label={{
                        value: "Số đơn",
                        angle: -90,
                        position: "insideLeft",
                        style: { fill: "var(--muted-foreground)", fontSize: 12 },
                      }}
                    />
                    <Tooltip
                      contentStyle={{ ...chartTooltipStyle, fontSize: 13 }}
                      labelStyle={chartTooltipLabelStyle}
                    />
                    <Legend wrapperStyle={{ fontSize: 13, paddingTop: 8 }} />
                    <Bar dataKey="new" stackId="a" fill={C.cyan} name="Chưa TT" />
                    <Bar dataKey="paydone" stackId="a" fill={C.green} name="Đã TT" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Career + Hope */}
            <div className="grid grid-cols-1 gap-[20px] md:grid-cols-2">
              <div className={panelClass}>
                <SectionTitle color={C.purple}>Chân dung khách (career)</SectionTitle>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={careerStats} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={subtleGrid} />
                      <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                      <YAxis
                        dataKey="label"
                        type="category"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 13, fontWeight: 500 }}
                        width={250}
                        interval={0}
                        tickFormatter={(value: string) => truncateLabel(value, 38)}
                      />
                      <Tooltip
                        contentStyle={{ ...chartTooltipStyle, fontSize: 13 }}
                        labelStyle={chartTooltipLabelStyle}
                      />
                      <Bar dataKey="count" fill={C.purple} radius={[0, 4, 4, 0]} name="Số lượng" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={panelClass}>
                <SectionTitle color={C.cyan}>Mục đích tham dự (hope)</SectionTitle>
                <div className="h-[400px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hopeStats} layout="vertical" margin={{ top: 4, right: 24, bottom: 4, left: 8 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke={subtleGrid} />
                      <XAxis type="number" tick={{ fill: "var(--muted-foreground)", fontSize: 12 }} />
                      <YAxis
                        dataKey="label"
                        type="category"
                        tick={{ fill: "var(--muted-foreground)", fontSize: 13, fontWeight: 500 }}
                        width={250}
                        interval={0}
                        tickFormatter={(value: string) => truncateLabel(value, 38)}
                      />
                      <Tooltip
                        contentStyle={{ ...chartTooltipStyle, fontSize: 13 }}
                        labelStyle={chartTooltipLabelStyle}
                      />
                      <Bar dataKey="count" fill={C.cyan} radius={[0, 4, 4, 0]} name="Số lượng" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          </div>
        )}

        {view === "brand" && (
          <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-muted-foreground text-xs font-medium">Chọn nhãn hàng:</span>
              {brandDashboards.map((b) => (
                <button
                  key={b.id}
                  onClick={() => setSelectedBrand(b.id)}
                  className={`cursor-pointer rounded-lg border px-3.5 py-1.5 text-[11px] transition-colors ${bd.id === b.id ? "border-primary bg-primary text-primary-foreground font-semibold" : "border-border bg-muted/40 text-muted-foreground hover:bg-accent hover:text-accent-foreground font-normal"}`}
                >
                  {b.name}
                </button>
              ))}
            </div>

            <div className="bg-card text-card-foreground rounded-xl border p-6 shadow-sm">
              <div className="mb-4 flex items-center gap-4">
                <div className="bg-primary/10 text-primary flex h-14 w-14 items-center justify-center rounded-xl text-[22px] font-semibold">
                  {bd.name.substring(0, 2)}
                </div>
                <div>
                  <div className="text-foreground text-[22px] font-semibold">{bd.name}</div>
                  <div className="text-muted-foreground text-xs">Báo cáo ROI — Beautyverse</div>
                </div>
              </div>
              <div className="flex flex-wrap gap-3">
                <StatCard label="Lượt vote" value={bd.votes} sub={`Rank #${bd.rank}`} color={C.pink} />
                <StatCard label="Người tương tác" value={bd.profileView} color={C.cyan} />
                <StatCard label="Booth traffic" value={bd.boothVisit} sub="lượt ghé" color={C.green} />
                <StatCard
                  label="Voucher claimed"
                  value={bd.voucherClaimed}
                  sub={`${bd.claimRate}% claim rate`}
                  color={C.goldLight}
                />
                <StatCard label="Mission hoàn thành" value={bd.missionComplete} color={C.purple} />
              </div>
            </div>

            <div className="grid grid-cols-1 gap-[20px] md:grid-cols-2">
              <div className={panelClass}>
                <SectionTitle color={C.pink}>Lượt vote theo thời gian</SectionTitle>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bd.voteTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke={subtleGrid} />
                      <XAxis dataKey="day" tick={chartTick} />
                      <YAxis tick={chartTick} />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} />
                      <Bar dataKey="v" fill={C.pink} radius={[4, 4, 0, 0]} name="Votes" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className={panelClass}>
                <SectionTitle color={C.green}>Booth traffic theo giờ</SectionTitle>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={bd.hourly}>
                      <defs>
                        <linearGradient id="gBooth" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stopColor={C.green} stopOpacity={0.3} />
                          <stop offset="100%" stopColor={C.green} stopOpacity={0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke={subtleGrid} />
                      <XAxis dataKey="time" tick={chartTick} />
                      <YAxis tick={chartTick} />
                      <Tooltip contentStyle={chartTooltipStyle} labelStyle={chartTooltipLabelStyle} />
                      <Area
                        type="monotone"
                        dataKey="booth"
                        stroke={C.green}
                        fill="url(#gBooth)"
                        name="Lượt ghé booth"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className={panelClass}>
              <SectionTitle color={C.goldLight}>Hiệu quả Voucher</SectionTitle>
              <div className="grid grid-cols-3 gap-[16px]">
                <div className="bg-muted/40 rounded-xl border p-4 text-center">
                  <div className={`${metricClass} ${getTextColor(C.goldLight)}`}>{bd.voucherIssued}</div>
                  <div className="text-muted-foreground text-[11px]">Voucher phát ra</div>
                </div>
                <div className="bg-muted/40 rounded-xl border p-4 text-center">
                  <div className={`${metricClass} ${getTextColor(C.green)}`}>{bd.voucherClaimed}</div>
                  <div className="text-muted-foreground text-[11px]">Đã được claim</div>
                </div>
                <div className="bg-muted/40 rounded-xl border p-4 text-center">
                  <div className={`${metricClass} ${getTextColor(C.pink)}`}>{bd.claimRate}%</div>
                  <div className="text-muted-foreground text-[11px]">Tỉ lệ claim</div>
                </div>
              </div>
            </div>

            <div className="bg-card text-card-foreground rounded-xl border p-5 shadow-sm">
              <div className="text-primary mb-3 text-sm font-semibold">Tóm tắt ROI cho {bd.name}</div>
              <div className="text-muted-foreground grid grid-cols-1 gap-3 text-[13px] leading-[1.8] md:grid-cols-2">
                <div>
                  <div>
                    ✓ <strong className="text-foreground">{bd.profileView.toLocaleString()}</strong> người tương tác
                  </div>
                  <div>
                    ✓ <strong className="text-foreground">{bd.votes.toLocaleString()}</strong> lượt bình chọn (Top #
                    {bd.rank})
                  </div>
                  <div>
                    ✓ <strong className="text-foreground">{bd.boothVisit.toLocaleString()}</strong> lượt ghé booth thực
                    tế
                  </div>
                </div>
                <div>
                  <div>
                    ✓ <strong className="text-foreground">{bd.voucherClaimed}</strong>/{bd.voucherIssued} voucher
                    claimed ({bd.claimRate}%)
                  </div>
                  <div>
                    ✓ <strong className="text-foreground">{bd.missionComplete.toLocaleString()}</strong> nhiệm vụ brand
                    hoàn thành
                  </div>
                  <div>✓ Data khách ghé booth → remarketing</div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
