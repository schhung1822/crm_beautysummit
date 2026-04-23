import { prisma } from "@/lib/prisma";
import DashboardClient from "./dashboard-client";

export default async function DashboardPage() {
  const registeredCount = await prisma.customer.count();
  const qrCreatedCount = await prisma.orders.count();
  const checkedInCount = await prisma.orders.count({ where: { is_checkin: 1 } });
  const voucherClaimedCount = await prisma.orders.count({ where: { NOT: { voucher_status: null } } });

  const initialStats = {
    registered: registeredCount,
    qrCreated: qrCreatedCount,
    checkedIn: checkedInCount,
    missionActive: Math.floor(checkedInCount * 0.9),
    voucherClaimed: voucherClaimedCount,
    vf3Eligible: Math.floor(voucherClaimedCount * 0.2),
  };

  return <DashboardClient events={initialStats} />;
}
