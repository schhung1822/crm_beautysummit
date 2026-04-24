import { hasCompletedAllTierMissions, parseStringArray } from "@/lib/miniapp-rewards";
import { prisma } from "@/lib/prisma";

import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const [
    checkedInCount,
    paidCount,
    unpaidCount,
    orderSources,
    votedRecords,
    rewards,
    grandPrizeVouchers,
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
  };

  return <DashboardClient events={initialStats} />;
}
