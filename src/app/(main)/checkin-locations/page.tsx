import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { getEventDay1Date } from "@/lib/event-settings";
import { CheckinLocationManager } from "./_components/checkin-location-manager";

export const metadata = {
  title: "Địa điểm check-in | Beauty Summit",
};

export default async function CheckinLocationsPage() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    redirect("/account");
  }

  const db = getDB();
  const [rows, eventDay1] = await Promise.all([
    db.query(
      "SELECT id, name, allowed_tiers, image_url, prerequisite, nc_order, is_active, DATE_FORMAT(event_date, '%Y-%m-%d') as event_date FROM checkin_locations ORDER BY nc_order ASC, id ASC"
    ) as any,
    getEventDay1Date(),
  ]);

  // Convert buffer mapping out of mysql
  const safeRows = rows[0].map((r: any) => ({
    ...r,
    is_active: r.is_active instanceof Buffer ? r.is_active[0] : (r.is_active ?? 1)
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2">
        <h1 className="text-3xl font-bold tracking-tight">Địa điểm check-in</h1>
        <p className="text-muted-foreground">
          Quản lý các điểm tiếp đón và phân quyền hạng vé
        </p>
      </div>
      <CheckinLocationManager initialData={safeRows} eventDay1={eventDay1} />
    </div>
  );
}
