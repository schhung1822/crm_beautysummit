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

  let topBrands = [];
  try {
    const grouped = await prisma.voted.groupBy({
      by: ["brand_id"],
      _count: { _all: true },
      orderBy: { _count: { brand_id: "desc" } },
      take: 10,
    });
    
    const brandIds = grouped.map(g => g.brand_id).filter(id => id !== null);
    const brands = await prisma.brand.findMany({ where: { brand_id: { in: brandIds } } });
    
    topBrands = grouped.map(g => {
      const b = brands.find(b => b.brand_id === g.brand_id);
      return {
        name: b?.brand_name || g.brand_id || "Unknown",
        votes: g._count._all,
        cat: b?.category || "Brand",
      };
    });
  } catch (err) {}

  let zones = [];
  try {
    const groupedZ = await prisma.checkin_log.groupBy({
      by: ["zone_name"],
      _count: { _all: true },
    });
    const colors = ["#B8860B", "#F0588C", "#9B7DB8", "#5BC8D8", "#22C55E"];
    zones = groupedZ.map((g, i) => ({
      name: g.zone_name || "Unknown",
      count: g._count._all,
      pct: checkedInCount > 0 ? Math.round((g._count._all / checkedInCount) * 100) : 0,
      color: colors[i % colors.length],
    }));
  } catch (err) {}

  return <DashboardClient events={initialStats} initialZones={zones} initialBrands={topBrands} />;
}
