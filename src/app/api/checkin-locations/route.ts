import { NextRequest, NextResponse } from "next/server";

import { z } from "zod";

import { getCurrentUser } from "@/lib/auth";
import { getDB } from "@/lib/db";
import { getEventDay1Date } from "@/lib/event-settings";

const BodySchema = z.object({
  id: z.number().optional(),
  name: z.string().min(1, "Thiếu tên địa điểm"),
  allowed_tiers: z.string().min(1, "Thiếu loại vé"),
  image_url: z.string().optional().nullable(),
  prerequisite: z.string().optional().nullable(),
  nc_order: z.coerce.number().optional().nullable(),
  is_active: z.number().optional().default(1),
  event_date: z.string().min(1, "Thiếu ngày diễn ra check-in"),
});

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== "admin") {
    // Only admin or staff can see it (staff needs it to load list)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const db = getDB();
  const [rows] = await db.query(
    "SELECT *, DATE_FORMAT(event_date, '%Y-%m-%d') as event_date FROM checkin_locations ORDER BY nc_order ASC, id ASC"
  ) as any[];

  // Convert buffer mapping (if TinyInt(1) throws Buffer)
  const safeRows = rows.map((r: any) => {
    return {
      ...r,
      is_active: r.is_active instanceof Buffer ? r.is_active[0] : (r.is_active ?? 1),
      // event_date is already formatted natively via DATE_FORMAT
    };
  });
  return NextResponse.json({ data: safeRows });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (false) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const json = await req.json();
    const body = BodySchema.parse(json);
    const eventDay1 = await getEventDay1Date();
    if (body.event_date <= eventDay1) {
      return NextResponse.json(
        { error: `Ngày check-in phải sau ngày 1 sự kiện (${eventDay1.split("-").reverse().join("/")})` },
        { status: 400 },
      );
    }
    const db = getDB();

    if (body.id) {
      const [existing] = await db.query(
        "SELECT id FROM checkin_locations WHERE name = ? AND id != ?",
        [body.name, body.id]
      ) as any[];
      if (existing.length > 0) {
        return NextResponse.json({ error: "Tên địa điểm đã tồn tại" }, { status: 400 });
      }

      await db.query(
        "UPDATE checkin_locations SET name = ?, allowed_tiers = ?, image_url = ?, prerequisite = ?, nc_order = ?, is_active = ?, event_date = ? WHERE id = ?",
        [body.name, body.allowed_tiers, body.image_url || null, body.prerequisite || null, body.nc_order || 0, body.is_active, body.event_date || null, body.id]
      );
      return NextResponse.json({ message: "Updated" });
    } else {
      const [existing] = await db.query(
        "SELECT id FROM checkin_locations WHERE name = ?",
        [body.name]
      ) as any[];
      if (existing.length > 0) {
        return NextResponse.json({ error: "Tên địa điểm đã tồn tại" }, { status: 400 });
      }

      const [result] = await db.query(
        "INSERT INTO checkin_locations (name, allowed_tiers, image_url, prerequisite, nc_order, is_active, event_date) VALUES (?, ?, ?, ?, ?, ?, ?)",
        [body.name, body.allowed_tiers, body.image_url || null, body.prerequisite || null, body.nc_order || 0, body.is_active, body.event_date || null]
      );
      return NextResponse.json({ message: "Created", insertId: (result as any).insertId });
    }
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
