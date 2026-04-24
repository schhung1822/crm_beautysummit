"use client";

import { useState } from "react";

import { BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts";

import { DatePicker } from "@/components/ui/date-picker";

const F = "'Be Vietnam Pro', sans-serif";
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

const FUNNEL_COLORS = [
  C.green,
  C.pink,
  C.goldLight,
  C.cyan,
  C.purple,
  C.orange,
  C.red,
  C.gold,
];

const DEFAULT_HOURLY = [{ time: "00:00", checkin: 0, active: 0 }];
const DEFAULT_ZONES = [{ name: "Chưa có dữ liệu", count: 0, pct: 0, color: C.gold }];
const DEFAULT_MISSION_PHASES = [
  { phase: "Trước SK", total: 0, completed: 0, avg: 0 },
  { phase: "Ngày 1", total: 0, completed: 0, avg: 0 },
  { phase: "Ngày 2", total: 0, completed: 0, avg: 0 },
];
const DEFAULT_TOP_VOTES: Array<{ name: string; votes: number; cat: string; logo?: string; productImage?: string }> = [];
const DEFAULT_DAILY_REG = [{ date: "--/--", reg: 0 }];
const NOTIFY_STATS = [
  { round: "Lần 1 — Nhắc lịch", sent: 4200, opened: 2940, converted: 680, openRate: 70, cvr: 16.2 },
  { round: "Lần 2 — Early bird", sent: 3520, opened: 2464, converted: 520, openRate: 70, cvr: 14.8 },
  { round: "Lần 3 — Countdown", sent: 3000, opened: 2250, converted: 430, openRate: 75, cvr: 14.3 },
  { round: "Lần 4 — Last call", sent: 2570, opened: 2056, converted: 380, openRate: 80, cvr: 14.8 },
];

const BRANDS = [
  "Sulwhasoo", "SK-II", "La Roche-Posay", "Estée Lauder", "Dermalogica",
  "FOREO", "NuFACE", "Charlotte Tilbury", "Dr. Dennis Gross", "Lancôme",
  "MAC Cosmetics", "NARS", "Dior Beauty", "Chanel Beauty", "Innisfree",
];

const getBrandData = (name: string) => {
  const seed = name.split("").reduce((a, c) => a + c.charCodeAt(0), 0);
  const r = (min: number, max: number) => Math.floor(((seed * 9301 + 49297) % 233280) / 233280 * (max - min) + min);
  const votes = r(200, 1200);
  const rank = r(5, 25);
  const voucherIssued = r(300, 800);
  const voucherClaimed = Math.floor(voucherIssued * (r(45, 82) / 100));
  const boothVisit = r(800, 3200);
  const profileView = r(1500, 6000);
  const missionComplete = r(200, 1500);
  return {
    votes, rank, voucherIssued, voucherClaimed,
    claimRate: Math.round(voucherClaimed / voucherIssued * 100),
    boothVisit, profileView, missionComplete,
    hourly: DEFAULT_HOURLY.map(h => ({ ...h, booth: Math.floor(boothVisit / 11 * (0.3 + Math.random() * 1.4)) })),
    voteTrend: [
      { day: "Trước SK", v: Math.floor(votes * 0.15) },
      { day: "Ngày 1 AM", v: Math.floor(votes * 0.35) },
      { day: "Ngày 1 PM", v: Math.floor(votes * 0.25) },
      { day: "Ngày 2 AM", v: Math.floor(votes * 0.15) },
      { day: "Ngày 2 PM", v: Math.floor(votes * 0.10) },
    ],
  };
};

const StatCard = ({ label, value, sub, color = C.goldLight }: any) => (
  <div className="dark:bg-slate-900 bg-slate-50 border border-slate-200 dark:border-slate-800" style={{ borderRadius: 16, padding: "20px 18px", flex: 1, minWidth: 140 }}>
    <div className="text-[11px] text-muted-foreground font-medium mb-[6px]" style={{ fontFamily: F }}>{label}</div>
    <div style={{ fontSize: 28, fontWeight: 800, color, fontFamily: "'Playfair Display', serif", lineHeight: 1 }}>{typeof value === "number" ? value.toLocaleString() : value}</div>
    {sub && <div className="text-[10px] text-muted-foreground mt-1" style={{ fontFamily: F }}>{sub}</div>}
  </div>
);

const SectionTitle = ({ children, color = C.goldLight }: any) => (
  <div className="text-foreground" style={{ fontSize: 16, fontWeight: 700, fontFamily: F, marginBottom: 16, display: "flex", alignItems: "center", gap: 8 }}>
    <div style={{ width: 4, height: 20, borderRadius: 2, background: color }} />
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
      pct: Math.round((item.value / totalOrders) * 100),
    }));
};

const isImageUrl = (value?: string): boolean => /^(data:image\/|https?:\/\/|\/)/i.test(String(value ?? "").trim());

export default function DashboardClient({ events }: { events: any }) {
  const [view, setView] = useState("leadership");
  const [selectedBrand, setSelectedBrand] = useState("Sulwhasoo");
  const bd = getBrandData(selectedBrand);

  const EVENT_STATS = events;
  const mappedFunnel = buildFunnelRows(EVENT_STATS);
  const hourlyStats = Array.isArray(EVENT_STATS.hourlyStats) && EVENT_STATS.hourlyStats.length > 0 ? EVENT_STATS.hourlyStats : DEFAULT_HOURLY;
  const hourlyDate = String(EVENT_STATS.hourlyDate ?? "");
  const eventDay1 = String(EVENT_STATS.eventDay1 ?? "");
  const checkinZones = Array.isArray(EVENT_STATS.checkinZones) && EVENT_STATS.checkinZones.length > 0 ? EVENT_STATS.checkinZones : DEFAULT_ZONES;
  const missionPhases = Array.isArray(EVENT_STATS.missionPhases) && EVENT_STATS.missionPhases.length > 0 ? EVENT_STATS.missionPhases : DEFAULT_MISSION_PHASES;
  const topVotes = Array.isArray(EVENT_STATS.topVotes) ? EVENT_STATS.topVotes : DEFAULT_TOP_VOTES;
  const dailyRegistrations = Array.isArray(EVENT_STATS.dailyRegistrations) && EVENT_STATS.dailyRegistrations.length > 0 ? EVENT_STATS.dailyRegistrations : DEFAULT_DAILY_REG;

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

  return (
    <div className="pb-10 mx-auto" style={{ background: "transparent", fontFamily: F, maxWidth: 1200 }}>
      {/* HEADER */}
      <div className="border-b border-slate-200 dark:border-slate-800" style={{ padding: "12px 0px 20px 0px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div>
          <div style={{ fontSize: 10, letterSpacing: 4, color: C.gold, fontWeight: 700, marginBottom: 4 }}>BEAUTYVERSE</div>
          <div className="text-foreground" style={{ fontSize: 20, fontWeight: 800, fontFamily: "'Playfair Display', serif" }}>Dashboard</div>
        </div>
        <div style={{ display: "flex", gap: 6 }}>
          {[
            { key: "leadership", label: "📊 Ban Lãnh Đạo" },
            { key: "brand", label: "🏢 Nhãn Hàng" },
          ].map(t => (
            <button key={t.key} onClick={() => setView(t.key)} className={`transition-colors font-medium text-[13px] px-5 py-2.5 rounded-lg ${view === t.key ? "bg-amber-500 text-black font-bold" : "bg-slate-100 dark:bg-slate-800 text-muted-foreground"}`} style={{
              border: "none", cursor: "pointer", fontFamily: F,
            }}>{t.label}</button>
          ))}
        </div>
      </div>

      <div style={{ paddingTop: "24px" }}>
        {view === "leadership" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            {/* Top stats */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-start" }}>
              <StatCard label="Đăng ký" value={EVENT_STATS.registered} color={C.cyan} />
              <StatCard label="Đã thanh toán" value={EVENT_STATS.paid} color={C.green} />
              <StatCard label="Chưa TT" value={EVENT_STATS.unpaid} color={C.red} />
              <StatCard label="Check-in" value={EVENT_STATS.checkedIn} color={C.pink} />
              <StatCard label="Đổi voucher" value={EVENT_STATS.voucherClaimed} color={C.goldLight} />
              <StatCard label="Bình chọn" value={EVENT_STATS.voted} color={C.orange} />
              <StatCard label="Đủ ĐK VF3" value={EVENT_STATS.vf3Eligible} color={C.purple} />
            </div>

            {/* Funnel + Hourly */}
            <div className="grid grid-cols-1 md:grid-cols-[0.85fr_1.35fr] gap-[20px]">
              <div className="dark:bg-slate-900 bg-slate-50 border border-slate-200 dark:border-slate-800" style={{ borderRadius: 16, padding: 20 }}>
                <SectionTitle>Funnel chuyển đổi</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {mappedFunnel.map((f, i) => (
                    <div key={i} style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <div className="text-muted-foreground" style={{ width: 80, fontSize: 11, textAlign: "right", flexShrink: 0 }}>{f.stage}</div>
                      <div className="dark:bg-slate-800 bg-slate-200" style={{ flex: 1, height: 24, borderRadius: 6, overflow: "hidden", position: "relative" }}>
                        <div style={{ height: "100%", width: `${f.pct}%`, background: f.color, borderRadius: 6, transition: "width 1s ease" }} />
                        <span style={{ position: "absolute", right: 8, top: 4, fontSize: 10, fontWeight: 700, color: "#fff" }}>{f.value.toLocaleString()}</span>
                      </div>
                      <div style={{ width: 40, fontSize: 11, fontWeight: 700, color: f.color }}>{f.pct}%</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="dark:bg-slate-900 bg-slate-50 border border-slate-200 dark:border-slate-800" style={{ borderRadius: 16, padding: 20 }}>
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <SectionTitle color={C.cyan}>Check-in & Active theo giờ</SectionTitle>
                  <DatePicker
                    value={hourlyDate}
                    onChange={handleHourlyDateChange}
                    className="w-[190px]"
                  />
                </div>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={hourlyStats}>
                      <defs>
                        <linearGradient id="gCI" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.gold} stopOpacity={0.3}/><stop offset="100%" stopColor={C.gold} stopOpacity={0}/></linearGradient>
                        <linearGradient id="gAct" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.cyan} stopOpacity={0.3}/><stop offset="100%" stopColor={C.cyan} stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" />
                      <XAxis dataKey="time" tick={{ fill: "rgba(150,150,150,0.5)", fontSize: 10 }} />
                      <YAxis tick={{ fill: "rgba(150,150,150,0.5)", fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "#222", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
                      <Area type="monotone" dataKey="checkin" stroke={C.gold} fill="url(#gCI)" name="Check-in" />
                      <Area type="monotone" dataKey="active" stroke={C.cyan} fill="url(#gAct)" name="Active user" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            {/* Zone + Missions */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
              <div className="dark:bg-slate-900 bg-slate-50 border border-slate-200 dark:border-slate-800" style={{ borderRadius: 16, padding: 20 }}>
                <SectionTitle color={C.pink}>Check-in theo khu vực</SectionTitle>
                {checkinZones.map((z: any, i: number) => (
                  <div key={i} style={{ marginBottom: 14 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span className="text-foreground" style={{ fontSize: 13, fontWeight: 600 }}>{z.name}</span>
                      <span style={{ fontSize: 13, fontWeight: 700, color: z.color }}>{z.count.toLocaleString()}</span>
                    </div>
                    <div className="dark:bg-slate-800 bg-slate-200" style={{ height: 8, borderRadius: 4, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${z.pct}%`, background: z.color, borderRadius: 4 }} />
                    </div>
                    <div className="text-muted-foreground" style={{ fontSize: 10, marginTop: 2 }}>{z.pct}% tổng check-in</div>
                  </div>
                ))}
              </div>

              <div className="dark:bg-slate-900 bg-slate-50 border border-slate-200 dark:border-slate-800" style={{ borderRadius: 16, padding: 20 }}>
                <SectionTitle color={C.green}>Nhiệm vụ theo giai đoạn</SectionTitle>
                {missionPhases.map((m: any, i: number) => (
                  <div key={i} className="dark:bg-slate-800 bg-slate-100 border border-slate-200 dark:border-slate-700" style={{ marginBottom: 16, padding: 14, borderRadius: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                      <span className="text-foreground" style={{ fontSize: 13, fontWeight: 700 }}>{m.phase}</span>
                      <span style={{ fontSize: 12, color: C.green, fontWeight: 700 }}>{m.avg}% trung bình</span>
                    </div>
                    <div className="text-muted-foreground" style={{ fontSize: 11 }}>{m.total} nhiệm vụ · {m.completed.toLocaleString()} lượt hoàn thành</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Top brands + Notify */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
              <div className="dark:bg-slate-900 bg-slate-50 border border-slate-200 dark:border-slate-800" style={{ borderRadius: 16, padding: 20 }}>
                <SectionTitle color={C.purple}>Top 10 bình chọn</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  {topVotes.map((b: any, i: number) => {
                    const imageUrl = b.logo || b.productImage;
                    return (
                    <div key={i} className="text-foreground" style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", borderRadius: 8, background: i < 3 ? "rgba(255,215,0,0.04)" : "transparent" }}>
                      <div className={i < 3 ? "text-slate-900" : "text-muted-foreground"} style={{ width: 24, height: 24, borderRadius: 6, background: i < 3 ? C.gold : "transparent", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>
                        {i + 1}
                      </div>
                      {isImageUrl(imageUrl) ? (
                        <img src={imageUrl} alt={b.name} className="h-8 w-8 rounded-md bg-white object-contain p-1" />
                      ) : null}
                      <div style={{ flex: 1 }}>
                        <span style={{ fontSize: 12, fontWeight: 600 }}>{b.name}</span>
                        <span className="text-muted-foreground" style={{ fontSize: 10, marginLeft: 8 }}>{b.cat}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: i < 3 ? C.goldLight : "inherit" }}>{b.votes.toLocaleString()}</span>
                    </div>
                  )})}
                </div>
              </div>

              <div className="dark:bg-slate-900 bg-slate-50 border border-slate-200 dark:border-slate-800" style={{ borderRadius: 16, padding: 20 }}>
                <SectionTitle color={C.orange}>Hiệu quả Notify (trước SK)</SectionTitle>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {NOTIFY_STATS.map((n, i) => (
                    <div key={i} className="dark:bg-slate-800 bg-slate-100 border border-slate-200 dark:border-slate-700" style={{ padding: 12, borderRadius: 10 }}>
                      <div className="text-foreground" style={{ fontSize: 12, fontWeight: 600, marginBottom: 6 }}>{n.round}</div>
                      <div style={{ display: "flex", gap: 12 }}>
                        <div><span className="text-muted-foreground" style={{ fontSize: 10 }}>Gửi </span><span style={{ fontSize: 13, fontWeight: 700, color: C.cyan }}>{n.sent.toLocaleString()}</span></div>
                        <div><span className="text-muted-foreground" style={{ fontSize: 10 }}>Mở </span><span style={{ fontSize: 13, fontWeight: 700, color: C.goldLight }}>{n.openRate}%</span></div>
                        <div><span className="text-muted-foreground" style={{ fontSize: 10 }}>Convert </span><span style={{ fontSize: 13, fontWeight: 700, color: C.green }}>{n.converted}</span></div>
                        <div><span className="text-muted-foreground" style={{ fontSize: 10 }}>CVR </span><span style={{ fontSize: 13, fontWeight: 700, color: C.pink }}>{n.cvr}%</span></div>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="bg-green-50 dark:bg-green-950/20 border-green-200 dark:border-green-900/30" style={{ marginTop: 12, padding: 10, borderRadius: 8, border: "1px solid" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: C.green }}>Tổng convert từ 4 lần notify: {NOTIFY_STATS.reduce((a, n) => a + n.converted, 0).toLocaleString()} đăng ký</span>
                </div>
              </div>
            </div>

            {/* Registration trend */}
            <div className="dark:bg-slate-900 bg-slate-50 border border-slate-200 dark:border-slate-800" style={{ borderRadius: 16, padding: 20 }}>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <SectionTitle>Lượng đăng ký 7 ngày trước sự kiện</SectionTitle>
                <DatePicker value={eventDay1} onChange={handleEventDay1Change} className="w-[190px]" />
              </div>
              <div className="h-[180px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dailyRegistrations}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" />
                    <XAxis dataKey="date" tick={{ fill: "rgba(150,150,150,0.5)", fontSize: 10 }} />
                    <YAxis tick={{ fill: "rgba(150,150,150,0.5)", fontSize: 10 }} />
                    <Tooltip contentStyle={{ background: "#222", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
                    <Bar dataKey="reg" fill={C.gold} radius={[4, 4, 0, 0]} name="Đăng ký" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}

        {view === "brand" && (
          <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
            <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
              <span className="text-muted-foreground" style={{ fontSize: 12, fontWeight: 500 }}>Chọn nhãn hàng:</span>
              {BRANDS.map(b => (
                <button key={b} onClick={() => setSelectedBrand(b)} className="transition-colors" style={{
                  padding: "6px 14px", borderRadius: 8, border: "none", cursor: "pointer", fontFamily: F,
                  fontSize: 11, fontWeight: selectedBrand === b ? 700 : 400,
                  background: selectedBrand === b ? C.pink : "rgba(150,150,150,0.1)",
                  color: selectedBrand === b ? "#fff" : "inherit",
                }}>{b}</button>
              ))}
            </div>

            <div style={{ background: `linear-gradient(135deg, ${C.pink}15, ${C.purple}10)`, borderRadius: 20, padding: 24, border: `1px solid ${C.pink}30` }}>
              <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 16 }}>
                <div style={{ width: 56, height: 56, borderRadius: 16, background: `linear-gradient(135deg, ${C.pink}30, ${C.purple}20)`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, fontWeight: 900, color: C.pink, fontFamily: F }}>{selectedBrand.substring(0, 2)}</div>
                <div>
                  <div className="text-foreground" style={{ fontSize: 22, fontWeight: 800, fontFamily: "'Playfair Display', serif" }}>{selectedBrand}</div>
                  <div className="text-muted-foreground" style={{ fontSize: 12 }}>Báo cáo ROI — Beautyverse</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
                <StatCard label="Lượt vote" value={bd.votes} sub={`Rank #${bd.rank}`} color={C.pink} />
                <StatCard label="Profile views" value={bd.profileView} color={C.cyan} />
                <StatCard label="Booth traffic" value={bd.boothVisit} sub="lượt ghé" color={C.green} />
                <StatCard label="Voucher claimed" value={bd.voucherClaimed} sub={`${bd.claimRate}% claim rate`} color={C.goldLight} />
                <StatCard label="Mission hoàn thành" value={bd.missionComplete} color={C.purple} />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-[20px]">
              <div className="dark:bg-slate-900 bg-slate-50 border border-slate-200 dark:border-slate-800" style={{ borderRadius: 16, padding: 20 }}>
                <SectionTitle color={C.pink}>Lượt vote theo thời gian</SectionTitle>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={bd.voteTrend}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" />
                      <XAxis dataKey="day" tick={{ fill: "rgba(150,150,150,0.5)", fontSize: 10 }} />
                      <YAxis tick={{ fill: "rgba(150,150,150,0.5)", fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "#222", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
                      <Bar dataKey="v" fill={C.pink} radius={[4, 4, 0, 0]} name="Votes" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="dark:bg-slate-900 bg-slate-50 border border-slate-200 dark:border-slate-800" style={{ borderRadius: 16, padding: 20 }}>
                <SectionTitle color={C.green}>Booth traffic theo giờ</SectionTitle>
                <div className="h-[200px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={bd.hourly}>
                      <defs>
                        <linearGradient id="gBooth" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={C.green} stopOpacity={0.3}/><stop offset="100%" stopColor={C.green} stopOpacity={0}/></linearGradient>
                      </defs>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(150,150,150,0.1)" />
                      <XAxis dataKey="time" tick={{ fill: "rgba(150,150,150,0.5)", fontSize: 10 }} />
                      <YAxis tick={{ fill: "rgba(150,150,150,0.5)", fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: "#222", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 8, fontSize: 12, color: "#fff" }} />
                      <Area type="monotone" dataKey="booth" stroke={C.green} fill="url(#gBooth)" name="Lượt ghé booth" />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>

            <div className="dark:bg-slate-900 bg-slate-50 border border-slate-200 dark:border-slate-800" style={{ borderRadius: 16, padding: 20 }}>
              <SectionTitle color={C.goldLight}>Hiệu quả Voucher</SectionTitle>
              <div className="grid grid-cols-3 gap-[16px]">
                <div className="dark:bg-slate-800 bg-slate-100 border border-slate-200 dark:border-slate-700" style={{ padding: 16, borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: C.goldLight, fontFamily: "'Playfair Display', serif" }}>{bd.voucherIssued}</div>
                  <div className="text-muted-foreground" style={{ fontSize: 11 }}>Voucher phát ra</div>
                </div>
                <div className="dark:bg-slate-800 bg-slate-100 border border-slate-200 dark:border-slate-700" style={{ padding: 16, borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: C.green, fontFamily: "'Playfair Display', serif" }}>{bd.voucherClaimed}</div>
                  <div className="text-muted-foreground" style={{ fontSize: 11 }}>Đã được claim</div>
                </div>
                <div className="dark:bg-slate-800 bg-slate-100 border border-slate-200 dark:border-slate-700" style={{ padding: 16, borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 800, color: C.pink, fontFamily: "'Playfair Display', serif" }}>{bd.claimRate}%</div>
                  <div className="text-muted-foreground" style={{ fontSize: 11 }}>Tỉ lệ claim</div>
                </div>
              </div>
            </div>

            <div style={{ background: `linear-gradient(135deg, ${C.gold}10, ${C.pink}08)`, borderRadius: 16, padding: 20, border: `1px solid ${C.gold}25` }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: C.goldLight, marginBottom: 12 }}>📋 Tóm tắt ROI cho {selectedBrand}</div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-[12px] text-muted-foreground" style={{ fontSize: 13, lineHeight: 1.8 }}>
                <div>
                  <div>✓ <strong className="text-foreground">{bd.profileView.toLocaleString()}</strong> lượt xem thương hiệu</div>
                  <div>✓ <strong className="text-foreground">{bd.votes.toLocaleString()}</strong> lượt bình chọn (Top #{bd.rank})</div>
                  <div>✓ <strong className="text-foreground">{bd.boothVisit.toLocaleString()}</strong> lượt ghé booth thực tế</div>
                </div>
                <div>
                  <div>✓ <strong className="text-foreground">{bd.voucherClaimed}</strong>/{bd.voucherIssued} voucher claimed ({bd.claimRate}%)</div>
                  <div>✓ <strong className="text-foreground">{bd.missionComplete.toLocaleString()}</strong> nhiệm vụ brand hoàn thành</div>
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
