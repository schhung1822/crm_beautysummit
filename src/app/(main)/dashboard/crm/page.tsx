import { getEventDay1Date } from "@/lib/event-settings";
import {
  getMiniAppMissionIdsByTier,
  getMiniAppMissionPhaseKey,
  hasCompletedAllTierMissions,
  normalizeMissionId,
  parseStringArray,
  type MiniAppMissionTier,
} from "@/lib/miniapp-rewards";
import { toDatabasePhone } from "@/lib/phone";
import { prisma } from "@/lib/prisma";

import DashboardClient from "./dashboard-client";

type HourlyCountRow = { hour: number | string | null; count: bigint | number | string | null };
type CheckinZoneRow = { id: bigint | number | string | null; name: string | null; count: bigint | number | string | null };
type VoteRankRow = {
  brandId: string | null;
  name: string | null;
  product: string | null;
  category: string | null;
  logo: string | null;
  productImage: string | null;
  votes: bigint | number | string | null;
};
type DailyRegistrationRow = { date: Date | string | null; count: bigint | number | string | null };
type NotifyEffectRow = {
  round: bigint | number | string | null;
  sent: bigint | number | string | null;
  converted: bigint | number | string | null;
};
type TicketTierRow = { phone: string | null; class: string | null };
type PaymentByTierRow = { tier: string | null; status: string | null; count: bigint | number | string | null };
type LabelCountRow = { label: string | null; count: bigint | number | string | null };
type DashboardSearchParams = Promise<Record<string, string | string[] | undefined>>;

function formatDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, "0");
  const day = String(value.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseSelectedDate(value: string | string[] | undefined) {
  const rawValue = Array.isArray(value) ? value[0] : value;
  if (!rawValue || !/^\d{4}-\d{2}-\d{2}$/.test(rawValue)) {
    return new Date();
  }

  const [year, month, day] = rawValue.split("-").map(Number);
  const parsed = new Date(year, month - 1, day);
  return Number.isNaN(parsed.getTime()) ? new Date() : parsed;
}

function buildDateRange(selectedDate: Date) {
  const start = new Date(selectedDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(start);
  end.setDate(end.getDate() + 1);
  return { start, end };
}

function parseDateKey(value: string) {
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

function buildHourlyStats(activeRows: HourlyCountRow[], checkinRows: HourlyCountRow[], selectedDate: Date) {
  const activeByHour = new Map(activeRows.map((row) => [Number(row.hour), Number(row.count ?? 0)]));
  const checkinByHour = new Map(checkinRows.map((row) => [Number(row.hour), Number(row.count ?? 0)]));
  const todayKey = formatDateInputValue(new Date());
  const selectedDateKey = formatDateInputValue(selectedDate);
  const lastHour = selectedDateKey === todayKey ? new Date().getHours() : 23;

  return Array.from({ length: lastHour + 1 }, (_, hour) => ({
    time: `${String(hour).padStart(2, "0")}:00`,
    active: activeByHour.get(hour) ?? 0,
    checkin: checkinByHour.get(hour) ?? 0,
  }));
}

function buildCheckinZones(rows: CheckinZoneRow[]) {
  const colors = ["#B8860B", "#F0588C", "#9B7DB8", "#5BC8D8", "#22C55E", "#F97316"];
  const total = rows.reduce((sum, row) => sum + Number(row.count ?? 0), 0);
  return rows.map((row, index) => {
    const count = Number(row.count ?? 0);
    return {
      id: String(row.id ?? index),
      name: String(row.name ?? "Không rõ"),
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      color: colors[index % colors.length],
    };
  });
}

const MISSION_TIER_WEIGHT: Record<MiniAppMissionTier, number> = { GOLD: 1, RUBY: 2, VIP: 3 };

function normalizeMissionTier(value: unknown): MiniAppMissionTier | null {
  const normalized = String(value ?? "").trim().toUpperCase();
  if (normalized.includes("VIP")) return "VIP";
  if (normalized.includes("RUBY") || normalized.includes("PRE")) return "RUBY";
  if (normalized.includes("GOLD") || normalized.includes("STAN")) return "GOLD";
  return null;
}

function inferMissionTier(completedIds: string[]): MiniAppMissionTier {
  return completedIds.reduce<MiniAppMissionTier>((bestTier, missionId) => {
    const tier = normalizeMissionTier(missionId.split("-")[0]);
    if (!tier) return bestTier;
    return MISSION_TIER_WEIGHT[tier] > MISSION_TIER_WEIGHT[bestTier] ? tier : bestTier;
  }, "GOLD");
}

function buildTierByPhone(rows: TicketTierRow[]) {
  const tierByPhone = new Map<string, MiniAppMissionTier>();

  rows.forEach((row) => {
    const phone = toDatabasePhone(row.phone);
    const tier = normalizeMissionTier(row.class);
    if (!phone || !tier) return;

    const currentTier = tierByPhone.get(phone);
    if (!currentTier || MISSION_TIER_WEIGHT[tier] > MISSION_TIER_WEIGHT[currentTier]) {
      tierByPhone.set(phone, tier);
    }
  });

  return tierByPhone;
}

function getMissionSuffix(missionId: string) {
  return missionId.split("-").slice(1).join("-");
}

function getMissionPhase(missionId: string) {
  return getMiniAppMissionPhaseKey(missionId);
}

function buildMissionPhases(
  rewards: Array<{ phone: string | null; completed_mission_ids: string | null }>,
  ticketTierRows: TicketTierRow[],
  customerCount: number,
) {
  const rows = [
    { key: "before", phase: "Trước SK", total: 0, completed: 0 },
    { key: "day1", phase: "Ngày 1", total: 0, completed: 0 },
    { key: "day2", phase: "Ngày 2", total: 0, completed: 0 },
  ];
  const rowMap = new Map(rows.map((row) => [row.key, row]));
  const missionIdsByTier = getMiniAppMissionIdsByTier();
  const allMissionIds = Object.values(missionIdsByTier).flat();
  const tierByPhone = buildTierByPhone(ticketTierRows);

  rows.forEach((row) => {
    row.total = new Set(
      allMissionIds
        .filter((missionId) => getMissionPhase(missionId) === row.key)
        .map(getMissionSuffix),
    ).size;
  });

  rewards.forEach((reward) => {
    const completedIds = parseStringArray(reward.completed_mission_ids);
    const completedSet = new Set(completedIds.map(normalizeMissionId).filter(Boolean));
    const phone = toDatabasePhone(reward.phone);
    const tier = (phone ? tierByPhone.get(phone) : null) ?? inferMissionTier(completedIds);

    rows.forEach((row) => {
      const phaseMissionIds = missionIdsByTier[tier].filter((missionId) => getMissionPhase(missionId) === row.key);
      if (phaseMissionIds.length === 0) return;
      if (phaseMissionIds.every((missionId) => completedSet.has(missionId))) {
        rowMap.get(row.key)!.completed += 1;
      }
    });
  });

  return rows.map(({ key: _key, ...row }) => {
    const possible = customerCount;
    return {
      ...row,
      possible,
      avg: possible > 0 ? Math.round((row.completed / possible) * 1000) / 10 : 0,
    };
  });
}

function buildTopVotes(rows: VoteRankRow[]) {
  return rows.map((row) => ({
    id: String(row.brandId ?? ""),
    name: String(row.product ?? row.name ?? "Không rõ"),
    cat: String(row.category ?? ""),
    logo: String(row.logo ?? ""),
    productImage: String(row.productImage ?? ""),
    votes: Number(row.votes ?? 0),
  }));
}

function buildDailyRegistration(rows: DailyRegistrationRow[], eventDay1: string) {
  const eventDate = parseDateKey(eventDay1);
  const start = new Date(eventDate);
  start.setDate(start.getDate() - 7);
  const countByDate = new Map(
    rows.map((row) => {
      const date = row.date instanceof Date ? row.date : new Date(String(row.date));
      return [formatDateInputValue(date), Number(row.count ?? 0)] as const;
    }),
  );

  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(start);
    date.setDate(start.getDate() + index);
    const key = formatDateInputValue(date);
    return {
      date: `${String(date.getDate()).padStart(2, "0")}/${String(date.getMonth() + 1).padStart(2, "0")}`,
      reg: countByDate.get(key) ?? 0,
    };
  });
}

function buildPaymentByTier(rows: PaymentByTierRow[]) {
  const tiers = ["VIP", "GOLD", "RUBY"] as const;
  const map = new Map(tiers.map((tier) => [tier, { tier, new: 0, paydone: 0 }]));

  rows.forEach((row) => {
    const tier = String(row.tier ?? "").trim().toUpperCase();
    if (!map.has(tier as typeof tiers[number])) return;
    const status = String(row.status ?? "").toLowerCase() === "paydone" ? "paydone" : "new";
    map.get(tier as typeof tiers[number])![status] += Number(row.count ?? 0);
  });

  return tiers.map((tier) => map.get(tier)!);
}

function buildLabelStats(rows: LabelCountRow[], limit: number) {
  return rows
    .map((row) => {
      const raw = String(row.label ?? "").trim();
      return {
        label: raw || "(trống)",
        count: Number(row.count ?? 0),
      };
    })
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function buildNotifyStats(rows: NotifyEffectRow[]) {
  const labels = [
    "Lần 1 - Nhắc lịch",
    "Lần 2 - Early bird",
    "Lần 3 - Countdown",
    "Lần 4 - Cuối cùng",
  ];
  const rowByRound = new Map(rows.map((row) => [Number(row.round ?? 0), row]));

  return labels.map((round, index) => {
    const row = rowByRound.get(index);
    const sent = Number(row?.sent ?? 0);
    const converted = Number(row?.converted ?? 0);
    return {
      round,
      sent,
      converted,
      cvr: sent > 0 ? Math.round((converted / sent) * 1000) / 10 : 0,
    };
  });
}

export default async function DashboardPage({ searchParams }: { searchParams: DashboardSearchParams }) {
  const params = await searchParams;
  const eventDay1 = await getEventDay1Date();
  const eventDay1Date = parseDateKey(eventDay1);
  const registrationStart = new Date(eventDay1Date);
  registrationStart.setDate(registrationStart.getDate() - 7);
  const registrationEnd = new Date(eventDay1Date);
  const selectedDate = parseSelectedDate(params.date);
  const selectedDateKey = formatDateInputValue(selectedDate);
  const { start: startOfSelectedDate, end: startOfNextDate } = buildDateRange(selectedDate);
  const [
    checkedInCount,
    paidCount,
    unpaidCount,
    orderSources,
    customerCount,
    votedRecords,
    rewards,
    ticketTierRows,
    grandPrizeVouchers,
    activeUserRows,
    checkinRows,
    checkinZoneRows,
    topVoteRows,
    dailyRegistrationRows,
    notifyEffectRows,
    paymentByTierRows,
    careerStatsRows,
    hopeStatsRows,
  ] = await Promise.all([
    prisma.orders.count({ where: { is_checkin: 1 } }),
    prisma.orders.count({ where: { status: 'paydone' } }),
    prisma.orders.count({ where: { NOT: { status: 'paydone' } } }),
    prisma.orders.findMany({ select: { source: true } }),
    prisma.customer.count(),
    prisma.voted.groupBy({ by: ['phone'] }),
    prisma.miniapp_user_reward_state.findMany({
      select: { phone: true, completed_mission_ids: true, redeemed_voucher_ids: true }
    }),
    prisma.orders.findMany({
      select: { phone: true, class: true },
    }),
    prisma.miniapp_voucher.findMany({
      where: { is_grand: 1 },
      select: { voucher_id: true },
    }),
    prisma.$queryRaw<HourlyCountRow[]>`
      SELECT HOUR(last_login) AS hour, COUNT(*) AS count
      FROM \`user\`
      WHERE last_login >= ${startOfSelectedDate}
        AND last_login < ${startOfNextDate}
      GROUP BY HOUR(last_login)
      ORDER BY hour ASC
    `,
    prisma.$queryRaw<HourlyCountRow[]>`
      SELECT HOUR(checkin_time) AS hour, COUNT(*) AS count
      FROM checkin_log
      WHERE checkin_time >= ${startOfSelectedDate}
        AND checkin_time < ${startOfNextDate}
      GROUP BY HOUR(checkin_time)
      ORDER BY hour ASC
    `,
    prisma.$queryRaw<CheckinZoneRow[]>`
      SELECT
        cl.id AS id,
        cl.name AS name,
        COUNT(logs.id) AS count
      FROM checkin_locations cl
      LEFT JOIN checkin_log logs
        ON logs.zone_id COLLATE utf8mb4_unicode_ci = CAST(cl.id AS CHAR) COLLATE utf8mb4_unicode_ci
      GROUP BY cl.id, cl.name, cl.nc_order
      ORDER BY cl.nc_order ASC, cl.id ASC
    `,
    prisma.$queryRaw<VoteRankRow[]>`
      SELECT
        b.brand_id AS brandId,
        COALESCE(b.product, b.brand_name, b.brand_id) AS name,
        b.product AS product,
        b.category AS category,
        b.logo_url AS logo,
        b.link AS productImage,
        COUNT(v.id) AS votes
      FROM brand b
      LEFT JOIN voted v ON v.brand_id COLLATE utf8mb4_unicode_ci = b.brand_id COLLATE utf8mb4_unicode_ci
      WHERE COALESCE(TRIM(b.brand_id), '') <> ''
      GROUP BY b.id, b.brand_id, b.product, b.brand_name, b.category, b.logo_url, b.link, b.nc_order
      ORDER BY votes DESC, name ASC, b.nc_order ASC, b.id ASC
      LIMIT 10
    `,
    prisma.$queryRaw<DailyRegistrationRow[]>`
      SELECT DATE(create_time) AS date, COUNT(*) AS count
      FROM orders
      WHERE create_time >= ${registrationStart}
        AND create_time < ${registrationEnd}
      GROUP BY DATE(create_time)
      ORDER BY date ASC
    `,
    prisma.$queryRaw<NotifyEffectRow[]>`
      SELECT 0 AS round, COUNT(*) AS sent,
        SUM(CASE WHEN status = 'paydone' THEN 1 ELSE 0 END) AS converted
      FROM orders
      UNION ALL
      SELECT 1 AS round, COUNT(*) AS sent,
        SUM(CASE WHEN status = 'paydone' THEN 1 ELSE 0 END) AS converted
      FROM orders WHERE COALESCE(send_noti, 0) >= 1
      UNION ALL
      SELECT 2 AS round, COUNT(*) AS sent,
        SUM(CASE WHEN status = 'paydone' THEN 1 ELSE 0 END) AS converted
      FROM orders WHERE COALESCE(send_noti, 0) >= 2
      UNION ALL
      SELECT 3 AS round, COUNT(*) AS sent,
        SUM(CASE WHEN status = 'paydone' THEN 1 ELSE 0 END) AS converted
      FROM orders WHERE COALESCE(send_noti, 0) >= 3
      ORDER BY round ASC
    `,
    prisma.$queryRaw<PaymentByTierRow[]>`
      SELECT
        UPPER(TRIM(class)) AS tier,
        CASE WHEN LOWER(TRIM(status)) = 'paydone' THEN 'paydone' ELSE 'new' END AS status,
        COUNT(*) AS count
      FROM orders
      WHERE UPPER(TRIM(class)) IN ('VIP', 'GOLD', 'RUBY')
      GROUP BY tier, status
    `,
    prisma.$queryRaw<LabelCountRow[]>`
      SELECT
        COALESCE(NULLIF(TRIM(career), ''), '(trống)') AS label,
        COUNT(*) AS count
      FROM orders
      GROUP BY label
      ORDER BY count DESC
      LIMIT 12
    `,
    prisma.$queryRaw<LabelCountRow[]>`
      SELECT
        COALESCE(NULLIF(TRIM(hope), ''), '(trống)') AS label,
        COUNT(*) AS count
      FROM orders
      GROUP BY label
      ORDER BY count DESC
      LIMIT 12
    `,
  ]);

  let sourceFbCount = 0;
  let sourceZaloCount = 0;
  let sourceWebCount = 0;

  for (const order of orderSources) {
    const source = (order.source ?? '').toLowerCase();
    if (source.includes('fbclid')) {
      sourceFbCount++;
    } else if (source.includes('zarsrc')) {
      sourceZaloCount++;
    } else {
      sourceWebCount++;
    }
  }

  const registeredCount = orderSources.length;
  const votedCount = votedRecords.length;

  let missionActiveCount = 0;
  let voucherClaimedCount = 0;
  let vf3EligibleCount = 0;
  const grandPrizeVoucherIds = new Set(grandPrizeVouchers.map((voucher) => voucher.voucher_id));

  for (const reward of rewards) {
    const redeemed = parseStringArray(reward.redeemed_voucher_ids);
    if (redeemed.length > 0) voucherClaimedCount++;

    const completed = parseStringArray(reward.completed_mission_ids);
    const redeemedGrandPrize = redeemed.some((voucherId) => grandPrizeVoucherIds.has(voucherId));
    if (completed.length > 0) {
      missionActiveCount++;
    }

    if (hasCompletedAllTierMissions(completed) || redeemedGrandPrize) {
      vf3EligibleCount++;
    }
  }

  const initialStats = {
    registered: registeredCount,
    totalOrders: orderSources.length,
    checkedIn: checkedInCount,
    missionActive: missionActiveCount,
    voucherClaimed: voucherClaimedCount,
    vf3Eligible: vf3EligibleCount,
    paid: paidCount,
    unpaid: unpaidCount,
    sourceFb: sourceFbCount,
    sourceZalo: sourceZaloCount,
    sourceWeb: sourceWebCount,
    voted: votedCount,
    hourlyStats: buildHourlyStats(activeUserRows, checkinRows, selectedDate),
    hourlyDate: selectedDateKey,
    checkinZones: buildCheckinZones(checkinZoneRows),
    missionPhases: buildMissionPhases(rewards, ticketTierRows, customerCount),
    topVotes: buildTopVotes(topVoteRows),
    dailyRegistrations: buildDailyRegistration(dailyRegistrationRows, eventDay1),
    notifyStats: buildNotifyStats(notifyEffectRows),
    paymentByTier: buildPaymentByTier(paymentByTierRows),
    careerStats: buildLabelStats(careerStatsRows, 10),
    hopeStats: buildLabelStats(hopeStatsRows, 10),
    eventDay1,
  };

  return <DashboardClient events={initialStats} />;
}
