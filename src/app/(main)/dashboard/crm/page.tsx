import { getEventDay1Date } from "@/lib/event-settings";
import { hasCompletedAllTierMissions, parseStringArray } from "@/lib/miniapp-rewards";
import { prisma } from "@/lib/prisma";

import DashboardClient from "./dashboard-client";

type HourlyCountRow = { hour: number | string | null; count: bigint | number | string | null };
type CheckinZoneRow = { name: string | null; count: bigint | number | string | null };
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
      name: String(row.name || "Không rõ"),
      count,
      pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
      color: colors[index % colors.length],
    };
  });
}

function getMissionPhase(missionId: string) {
  const suffix = missionId.split("-").slice(1).join("-");
  if (suffix.startsWith("b")) return "before";
  if (suffix.startsWith("d1")) return "day1";
  if (suffix.startsWith("d2")) return "day2";
  return null;
}

function buildMissionPhases(rewards: Array<{ completed_mission_ids: string | null }>) {
  const rows = [
    { key: "before", phase: "Trước SK", total: 0, completed: 0 },
    { key: "day1", phase: "Ngày 1", total: 0, completed: 0 },
    { key: "day2", phase: "Ngày 2", total: 0, completed: 0 },
  ];
  const rowMap = new Map(rows.map((row) => [row.key, row]));

  rewards.forEach((reward) => {
    const seenPhases = new Set<string>();
    parseStringArray(reward.completed_mission_ids).forEach((missionId) => {
      const phase = getMissionPhase(missionId);
      if (!phase) return;
      rowMap.get(phase)!.completed += 1;
      seenPhases.add(phase);
    });
    seenPhases.forEach((phase) => {
      rowMap.get(phase)!.total += 1;
    });
  });

  return rows.map(({ key: _key, ...row }) => ({
    ...row,
    avg: row.total > 0 ? Math.round(row.completed / row.total) : 0,
  }));
}

function buildTopVotes(rows: VoteRankRow[]) {
  return rows.map((row) => ({
    id: String(row.brandId ?? ""),
    name: String(row.product || row.name || "Không rõ"),
    cat: String(row.category || ""),
    logo: String(row.logo || ""),
    productImage: String(row.productImage || ""),
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
    votedRecords,
    rewards,
    grandPrizeVouchers,
    activeUserRows,
    checkinRows,
    checkinZoneRows,
    topVoteRows,
    dailyRegistrationRows,
  ] = await Promise.all([
    prisma.orders.count({ where: { is_checkin: 1 } }),
    prisma.orders.count({ where: { status: 'paydone' } }),
    prisma.orders.count({ where: { NOT: { status: 'paydone' } } }),
    prisma.orders.findMany({ select: { source: true } }),
    prisma.voted.groupBy({ by: ['phone'] }),
    prisma.miniapp_user_reward_state.findMany({
      select: { completed_mission_ids: true, redeemed_voucher_ids: true }
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
      SELECT COALESCE(zone_name, zone_id, 'Không rõ') AS name, COUNT(*) AS count
      FROM checkin_log
      GROUP BY COALESCE(zone_name, zone_id, 'Không rõ')
      ORDER BY count DESC
    `,
    prisma.$queryRaw<VoteRankRow[]>`
      SELECT
        v.brand_id AS brandId,
        COALESCE(b.product, b.brand_name, v.brand_id) AS name,
        b.product AS product,
        b.category AS category,
        b.logo_url AS logo,
        b.link AS productImage,
        COUNT(*) AS votes
      FROM voted v
      LEFT JOIN brand b ON b.brand_id = v.brand_id
      WHERE COALESCE(TRIM(v.brand_id), '') <> ''
      GROUP BY v.brand_id, b.product, b.brand_name, b.category, b.logo_url, b.link
      ORDER BY votes DESC, name ASC
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
    missionPhases: buildMissionPhases(rewards),
    topVotes: buildTopVotes(topVoteRows),
    dailyRegistrations: buildDailyRegistration(dailyRegistrationRows, eventDay1),
    eventDay1,
  };

  return <DashboardClient events={initialStats} />;
}
